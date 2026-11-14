import type {
  ComparisonResult,
  GoalSpec,
  KnowledgeMap,
  Locale,
  NodeId,
  StoredLlmSettings,
  TargetSystem,
} from '$lib/types';
import { chatCompletion } from '$lib/llm/client';
import { LlmError } from '$lib/llm/errors';
import { hostOf } from '$lib/llm/estimate';
import { toast } from '$lib/state/toast.svelte';
import { t } from '$lib/i18n';
import { mapSignature, targetSignature } from '$lib/signature';
import { findTreeNode } from './scope';
import {
  COMPARISON_SYSTEM,
  GENERATION_SYSTEM,
  comparisonUserPrompt,
  generationUserPrompt,
  repairJsonPrompt,
} from './prompt';
import { countNodes, serializeTrees, type SerializedTrees } from './serialize';
import {
  parseJsonObject,
  validateComparison,
  validateGeneratedTarget,
  type ValidationContext,
} from './schema';

export { LlmError } from '$lib/llm/errors';
export type { ErrorCode } from '$lib/llm/errors';

const MAX_NODES_PER_SIDE = 400;

/** One call + at most one JSON repair. Never auto-retries the original request. */
async function callJson(
  settings: StoredLlmSettings,
  system: string,
  user: string,
  signal?: AbortSignal,
): Promise<unknown> {
  const first = await chatCompletion(settings, {
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
    signal,
  });
  if (first.finishReason === 'length') throw new LlmError('truncated');
  try {
    return parseJsonObject(first.content);
  } catch (error: unknown) {
    const reason = error instanceof Error ? error.message : String(error);
    const repair = await chatCompletion(settings, {
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
        { role: 'assistant', content: first.content },
        { role: 'user', content: repairJsonPrompt(first.content, reason) },
      ],
      signal,
    });
    if (repair.finishReason === 'length') throw new LlmError('truncated');
    try {
      return parseJsonObject(repair.content);
    } catch {
      throw new LlmError('parse');
    }
  }
}

export async function generateTarget(
  goal: GoalSpec,
  settings: StoredLlmSettings,
  signal?: AbortSignal,
): Promise<{ title: string; root: KnowledgeMap['root'] }> {
  const raw = await callJson(settings, GENERATION_SYSTEM, generationUserPrompt(goal), signal);
  const validated = validateGeneratedTarget(raw, goal.locale);
  if (validated.tooThin) toast.info(t('target.generate.tooThin'));
  return { title: validated.title, root: validated.root };
}

export async function runComparison(
  map: KnowledgeMap,
  target: TargetSystem,
  settings: StoredLlmSettings,
  locale: Locale,
  ignoredSignatures: string[],
  signal?: AbortSignal,
  scope: NodeId | null = null,
): Promise<ComparisonResult> {
  const scopedRoot = scope ? findTreeNode(target.root, scope) : null;
  if (scope && !scopedRoot) throw new LlmError('tooMany');
  // Serialize only the scoped subtree, but keep the FULL target for path signatures.
  const serializedTarget: TargetSystem = scopedRoot ? { ...target, root: scopedRoot } : target;
  const targetNodes = countNodes(serializedTarget.root);

  if (countNodes(map.root) > MAX_NODES_PER_SIDE || targetNodes > MAX_NODES_PER_SIDE) {
    throw new LlmError('tooMany');
  }

  const trees: SerializedTrees = serializeTrees(serializedTarget, map, {
    includeTargetNotes: !settings.compactPrompt,
  });
  const ctx: ValidationContext = {
    index: trees.index,
    target,
    map,
    locale,
    ignoredSignatures,
    mapSignature: mapSignature(map, locale),
    targetSignature: targetSignature(serializedTarget, locale),
    model: { host: hostOf(settings.baseUrl), model: settings.model },
  };
  const userPrompt = comparisonUserPrompt(trees, locale);

  let raw = await callJson(settings, COMPARISON_SYSTEM, userPrompt, signal);
  let validation = validateComparison(raw, ctx);

  // One coverage repair when the model analysed fewer than 90% of target ids.
  if (validation.idCoverage < 0.9) {
    try {
      const repair = await chatCompletion(settings, {
        messages: [
          { role: 'system', content: COMPARISON_SYSTEM },
          { role: 'user', content: userPrompt },
          { role: 'assistant', content: JSON.stringify(raw) },
          {
            role: 'user',
            content: repairJsonPrompt(JSON.stringify(raw), '目标 ID 覆盖率不足，请覆盖所有 t* 节点'),
          },
        ],
        signal,
      });
      if (repair.finishReason !== 'length') {
        const repairedRaw = parseJsonObject(repair.content);
        const repaired = validateComparison(repairedRaw, ctx);
        if (repaired.idCoverage > validation.idCoverage) {
          raw = repairedRaw;
          validation = repaired;
        }
      }
    } catch {
      // Keep the original partial result.
    }
  }

  if (!validation.result) throw new LlmError('empty');
  if (validation.warnings.includes('partial')) toast.info(t('compare.partial'));
  if (validation.warnings.includes('truncatedGaps')) toast.info(t('compare.gapsTruncated'));
  return validation.result;
}
