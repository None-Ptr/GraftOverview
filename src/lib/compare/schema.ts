import { nanoid } from 'nanoid';
import type {
  ComparisonResult,
  ExtraNode,
  GapSuggestion,
  KnowledgeMap,
  KnowledgeNode,
  Link,
  Locale,
  Match,
  NodeId,
  Priority,
  TargetSystem,
} from '$lib/types';
import { t } from '$lib/i18n';
import { LlmError } from '$lib/llm/errors';
import { pathSignature } from '$lib/signature';
import { computeStats, targetPathSignatures } from './signature';
import { countNodes, indexNodes, type PromptIndex } from './serialize';

export type ValidationWarning = 'partial' | 'truncatedGaps' | 'unknownIds';

export interface ValidationContext {
  index: PromptIndex;
  target: TargetSystem;
  map: KnowledgeMap;
  locale: Locale;
  ignoredSignatures: string[];
  mapSignature: string;
  targetSignature: string;
  model: ComparisonResult['model'];
  id?: string;
  createdAt?: string;
}

export interface ComparisonValidation {
  result: ComparisonResult | null;
  idCoverage: number;
  warnings: ValidationWarning[];
  dropped: {
    duplicate: number;
    unknownTarget: number;
    unknownUser: number;
    descendant: number;
    invalidParent: number;
    unknownExtras: number;
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function text(value: unknown, max: number): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

const PRIORITIES = new Set<string>(['high', 'medium', 'low']);
const PRIORITY_ORDER: Record<Priority, number> = { high: 0, medium: 1, low: 2 };

function cleanPriority(value: unknown): Priority {
  return typeof value === 'string' && PRIORITIES.has(value) ? (value as Priority) : 'medium';
}

function clampConfidence(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.min(1, Math.max(0, value))
    : 0.5;
}

function cleanReason(value: unknown): string {
  const cleaned = typeof value === 'string' ? value.replace(/[\r\n]+/g, ' ').trim().slice(0, 300) : '';
  return cleaned || t('compare.reasonFallback');
}

function cleanSelfCheck(value: unknown): string[] {
  const items = asArray(value)
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 3);
  return items.length > 0 ? items : [t('compare.selfCheckFallback')];
}

function cleanLinks(value: unknown): Link[] {
  const out: Link[] = [];
  for (const item of asArray(value)) {
    if (!isRecord(item)) continue;
    const url = text(item.url, 500);
    if (!/^https?:\/\//i.test(url)) continue;
    out.push({ title: text(item.title, 80) || url.slice(0, 80), url });
    if (out.length >= 2) break;
  }
  return out;
}

function treeDepth(node: KnowledgeNode): number {
  if (node.children.length === 0) return 1;
  return 1 + Math.max(...node.children.map(treeDepth));
}

/** Strip ```json fences and take the outermost object (§4.5). */
export function parseJsonObject(content: string): unknown {
  const withoutFences = content.replace(/```(?:json)?/gi, '').trim();
  const start = withoutFences.indexOf('{');
  const end = withoutFences.lastIndexOf('}');
  if (start < 0 || end <= start) throw new Error('no JSON object found');
  try {
    return JSON.parse(withoutFences.slice(start, end + 1)) as unknown;
  } catch (error: unknown) {
    throw new Error(error instanceof Error ? error.message : 'invalid JSON');
  }
}

/** §4.3 validation. Never trusts LLM-provided ids. */
export function validateGeneratedTarget(
  raw: unknown,
  _locale: Locale,
): { title: string; root: KnowledgeNode; tooThin: boolean } {
  if (!isRecord(raw)) throw new LlmError('empty');
  const build = (value: unknown): KnowledgeNode => {
    if (!isRecord(value)) throw new LlmError('parse');
    const topic = text(value.topic, 120);
    if (!topic) throw new LlmError('parse');
    const node: KnowledgeNode = { id: nanoid(8), topic, children: [] };
    const note = text(value.note, 200);
    if (note) node.note = note;
    for (const child of asArray(value.children)) node.children.push(build(child));
    return node;
  };
  const root = build(raw.root);
  const nodes = countNodes(root);
  if (treeDepth(root) > 4 || nodes > 140) throw new LlmError('tooMany');
  const title = text(raw.title, 60) || root.topic.slice(0, 60);
  return { title, root, tooThin: nodes < 60 };
}

/** §4.5 — full clean / repair / reference-integrity / stats pipeline. */
export function validateComparison(
  raw: unknown,
  ctx: ValidationContext,
): ComparisonValidation {
  const warnings: ValidationWarning[] = [];
  const dropped = {
    duplicate: 0,
    unknownTarget: 0,
    unknownUser: 0,
    descendant: 0,
    invalidParent: 0,
    unknownExtras: 0,
  };
  const record = isRecord(raw) ? raw : {};
  const rawMatches = asArray(record.matches);
  const rawGaps = asArray(record.gaps);
  const rawExtras = asArray(record.extras);

  const targetNodesById = indexNodes(ctx.target.root);
  const signatures = targetPathSignatures(ctx.target, ctx.locale);

  // How many target ids were actually analysed (before cleaning)?
  const mentioned = new Set<string>();
  for (const item of [...rawMatches, ...rawGaps]) {
    if (!isRecord(item)) continue;
    const short = text(item.targetId, 40);
    if (ctx.index.target.has(short)) mentioned.add(short);
  }
  const idCoverage =
    ctx.index.targetNodes > 0 ? mentioned.size / ctx.index.targetNodes : 0;
  if (idCoverage < 0.9) warnings.push('partial');

  // 1. Matches — match wins over a gap for the same target id.
  const matchedShorts = new Set<string>();
  const matches: Match[] = [];
  for (const item of rawMatches) {
    if (!isRecord(item)) continue;
    const targetShort = text(item.targetId, 40);
    const userShort = text(item.userNodeId, 40);
    if (!ctx.index.target.has(targetShort)) {
      dropped.unknownTarget += 1;
      continue;
    }
    if (!ctx.index.user.has(userShort)) {
      dropped.unknownUser += 1;
      continue;
    }
    if (matchedShorts.has(targetShort)) {
      dropped.duplicate += 1;
      continue;
    }
    matchedShorts.add(targetShort);
    matches.push({
      targetId: ctx.index.target.get(targetShort)!,
      userNodeId: ctx.index.user.get(userShort)!,
      confidence: clampConfidence(item.confidence),
    });
  }

  // 2. Gaps — de-duplicate, resolve parents, clean fields, derive signatures.
  const gapByShort = new Map<string, GapSuggestion>();
  const gapShorts: string[] = [];
  for (const item of rawGaps) {
    if (!isRecord(item)) continue;
    const targetShort = text(item.targetId, 40);
    if (!ctx.index.target.has(targetShort)) {
      dropped.unknownTarget += 1;
      continue;
    }
    if (matchedShorts.has(targetShort) || gapByShort.has(targetShort)) {
      dropped.duplicate += 1;
      continue;
    }
    const parentShort = text(item.suggestedUserParentId, 40);
    let suggestedParentId: NodeId | null = null;
    if (parentShort) {
      if (ctx.index.user.has(parentShort)) {
        suggestedParentId = ctx.index.user.get(parentShort)!;
      } else {
        dropped.invalidParent += 1;
      }
    }
    const realTargetId = ctx.index.target.get(targetShort)!;
    const targetNode = targetNodesById.get(realTargetId);
    const signature =
      signatures.get(realTargetId) ??
      pathSignature([targetNode?.topic ?? targetShort], ctx.locale);
    const gap: GapSuggestion = {
      signature,
      targetId: realTargetId,
      suggestedParentId,
      topic: (targetNode?.topic ?? text(item.topic, 120)).slice(0, 120),
      reason: cleanReason(item.reason),
      selfCheck: cleanSelfCheck(item.selfCheck),
      links: cleanLinks(item.links),
      priority: cleanPriority(item.priority),
      nodeCount: ctx.index.subtreeSize.get(targetShort) ?? 1,
      status: ctx.ignoredSignatures.includes(signature) ? 'ignored' : 'pending',
    };
    gapByShort.set(targetShort, gap);
    gapShorts.push(targetShort);
  }

  // 3. Highest missing subtree only — drop a gap whose ancestor is also a gap.
  const gapSet = new Set(gapShorts);
  const keptShorts = gapShorts.filter((short) => {
    let parent = ctx.index.targetParent.get(short) ?? null;
    while (parent) {
      if (gapSet.has(parent)) {
        dropped.descendant += 1;
        return false;
      }
      parent = ctx.index.targetParent.get(parent) ?? null;
    }
    return true;
  });

  let gaps = keptShorts.map((short) => gapByShort.get(short)!);
  if (gaps.length > 60) {
    gaps = [...gaps].sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]).slice(0, 60);
    warnings.push('truncatedGaps');
  }

  // 4. Extras — at most 20, unknown user ids dropped.
  const extras: ExtraNode[] = [];
  for (const item of rawExtras.slice(0, 20)) {
    if (!isRecord(item)) continue;
    const userShort = text(item.userNodeId, 40);
    if (!ctx.index.user.has(userShort)) {
      dropped.unknownExtras += 1;
      continue;
    }
    extras.push({
      userNodeId: ctx.index.user.get(userShort)!,
      reason: text(item.reason, 200) || t('compare.reasonFallback'),
    });
  }

  if (dropped.unknownTarget + dropped.unknownUser + dropped.invalidParent > 0) {
    warnings.push('unknownIds');
  }

  // 5. Empty result -> failure, keep the old comparison untouched.
  if (matches.length === 0 && gaps.length === 0) {
    return { result: null, idCoverage, warnings, dropped };
  }

  const stats = computeStats(gaps, ctx.index.targetNodes);
  const result: ComparisonResult = {
    id: ctx.id ?? nanoid(10),
    createdAt: ctx.createdAt ?? new Date().toISOString(),
    mapSignature: ctx.mapSignature,
    targetSignature: ctx.targetSignature,
    matches,
    gaps,
    extras,
    stats,
    model: ctx.model,
  };
  return { result, idCoverage, warnings, dropped };
}
