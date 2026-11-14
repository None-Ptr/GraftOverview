import { nanoid } from 'nanoid';
import type {
  GapSuggestion,
  GhostTree,
  KnowledgeMap,
  KnowledgeNode,
  Match,
  NodeId,
  TargetSystem,
} from '$lib/types';
import { ghostId } from '$lib/locate';
import { cloneMap } from '$lib/map/commands';
import { mapHistory } from '$lib/map/history.svelte';
import { workspaceStore } from '$lib/state/workspace.svelte';
import { toast } from '$lib/state/toast.svelte';
import { t } from '$lib/i18n';

function indexTarget(root: KnowledgeNode): Map<NodeId, KnowledgeNode> {
  const index = new Map<NodeId, KnowledgeNode>();
  const walk = (node: KnowledgeNode): void => {
    index.set(node.id, node);
    for (const child of node.children) walk(child);
  };
  walk(root);
  return index;
}

function findNode(root: KnowledgeNode, id: NodeId): KnowledgeNode | null {
  if (root.id === id) return root;
  for (const child of root.children) {
    const found = findNode(child, id);
    if (found) return found;
  }
  return null;
}

function cloneAsGhost(node: KnowledgeNode): KnowledgeNode {
  return {
    id: ghostId(node.id),
    topic: node.topic,
    ...(node.note !== undefined ? { note: node.note } : {}),
    children: node.children.map(cloneAsGhost),
  };
}

/** Only high-priority, pending, non-ignored gaps become on-canvas ghost trees. */
export function buildGhostTrees(
  target: TargetSystem | null,
  gaps: GapSuggestion[],
  ignored: string[],
): GhostTree[] {
  if (!target) return [];
  const index = indexTarget(target.root);
  const trees: GhostTree[] = [];
  for (const gap of gaps) {
    if (gap.priority !== 'high' || gap.status !== 'pending' || ignored.includes(gap.signature)) {
      continue;
    }
    const node = index.get(gap.targetId);
    if (!node) continue;
    trees.push({
      signature: gap.signature,
      parentId: gap.suggestedParentId,
      root: cloneAsGhost(node),
      priority: 'high',
    });
  }
  return trees;
}

/** Deep-clone the target subtree, skip already-matched descendants, attach under the parent. */
export function applyGapToMap(
  map: KnowledgeMap,
  gap: GapSuggestion,
  target: TargetSystem,
  matches: Match[],
): KnowledgeMap {
  const source = indexTarget(target.root).get(gap.targetId);
  if (!source) return map;
  const matched = new Set(matches.map((match) => match.targetId));
  const cloneSubtree = (node: KnowledgeNode): KnowledgeNode => ({
    id: nanoid(8),
    topic: node.topic,
    ...(node.note !== undefined ? { note: node.note } : {}),
    children: node.children
      .filter((child) => !matched.has(child.id))
      .map((child) => cloneSubtree(child)),
  });
  const inserted = cloneSubtree(source);
  const next = cloneMap(map);
  const parent =
    (gap.suggestedParentId ? findNode(next.root, gap.suggestedParentId) : null) ?? next.root;
  parent.children = [...parent.children, inserted];
  return next;
}

/** Adopt one gap: insert its subtree, mark adopted, and offer an undo toast. */
export function adoptGap(signature: string): void {
  const comparison = workspaceStore.comparison;
  const target = workspaceStore.target;
  if (!comparison || !target) return;
  const gap = comparison.gaps.find((item) => item.signature === signature);
  if (!gap || gap.status === 'adopted') return;

  const previousMap = cloneMap(workspaceStore.map);
  const previousStatus = gap.status;
  const nextMap = applyGapToMap(workspaceStore.map, gap, target, comparison.matches);
  mapHistory.push(workspaceStore.map, `adopt:${signature}`);
  workspaceStore.replaceMap(nextMap, { markStale: false });
  workspaceStore.updateGapStatus(signature, 'adopted');
  toast.info(t('suggest.adoptedToast', { name: gap.topic }), {
    label: t('common.undo'),
    run: () => {
      workspaceStore.replaceMap(previousMap, { markStale: false });
      workspaceStore.updateGapStatus(signature, previousStatus === 'ignored' ? 'ignored' : 'pending');
    },
  });
}

export function adoptGaps(signatures: string[]): void {
  const comparison = workspaceStore.comparison;
  const target = workspaceStore.target;
  if (!comparison || !target) return;
  const gaps = signatures
    .map((signature) => comparison.gaps.find((item) => item.signature === signature))
    .filter((gap): gap is GapSuggestion => gap !== undefined && gap.status !== 'adopted');
  if (gaps.length === 0) return;

  const previousMap = cloneMap(workspaceStore.map);
  let nextMap = workspaceStore.map;
  for (const gap of gaps) nextMap = applyGapToMap(nextMap, gap, target, comparison.matches);
  workspaceStore.replaceMap(nextMap, { markStale: false });
  for (const gap of gaps) workspaceStore.updateGapStatus(gap.signature, 'adopted');
  toast.info(t('suggest.batchAdopted', { count: gaps.length }), {
    label: t('common.undo'),
    run: () => {
      workspaceStore.replaceMap(previousMap, { markStale: false });
      for (const gap of gaps) workspaceStore.updateGapStatus(gap.signature, 'pending');
    },
  });
}

/** Ignore one gap; the signature is remembered so it never resurfaces. */
export function ignoreGap(signature: string): void {
  const gap = workspaceStore.comparison?.gaps.find((item) => item.signature === signature);
  if (!gap) return;
  const previousStatus = gap.status;
  workspaceStore.updateGapStatus(signature, 'ignored');
  workspaceStore.addIgnored(signature);
  toast.info(t('suggest.ignoredToast', { name: gap.topic }), {
    label: t('common.undo'),
    run: () => {
      workspaceStore.updateGapStatus(signature, previousStatus === 'adopted' ? 'adopted' : 'pending');
      workspaceStore.removeIgnored(signature);
    },
  });
}

export function ignoreGaps(signatures: string[]): void {
  const gaps = signatures
    .map((signature) => workspaceStore.comparison?.gaps.find((item) => item.signature === signature))
    .filter((gap): gap is GapSuggestion => Boolean(gap));
  if (gaps.length === 0) return;
  for (const gap of gaps) {
    workspaceStore.updateGapStatus(gap.signature, 'ignored');
    workspaceStore.addIgnored(gap.signature);
  }
  toast.info(t('suggest.batchIgnored', { count: gaps.length }), {
    label: t('common.undo'),
    run: () => {
      for (const gap of gaps) {
        workspaceStore.updateGapStatus(gap.signature, 'pending');
        workspaceStore.removeIgnored(gap.signature);
      }
    },
  });
}

export function restoreIgnored(signature: string): void {
  workspaceStore.updateGapStatus(signature, 'pending');
  workspaceStore.removeIgnored(signature);
}
