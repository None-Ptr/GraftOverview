import { nanoid } from 'nanoid';
import type {
  ComparisonResult,
  ExtraNode,
  GapSuggestion,
  Match,
  NodeId,
  TargetSystem,
} from '$lib/types';
import { countNodes } from './serialize';
import { computeStats } from './signature';
import { findTreeNode, topLevelBranches } from './scope';

/** Above this many target nodes, split the comparison by top-level branch. */
export const CHUNK_THRESHOLD = 150;
/** Hard per-request ceiling (§3.6). */
export const MAX_SIDE = 400;

export interface ChunkPlan {
  scope: NodeId | null;
  label: string;
  nodes: number;
}

/** One request per top-level branch for large targets; a single scoped request otherwise. */
export function planChunks(target: TargetSystem, scope: NodeId | null): ChunkPlan[] {
  const total = countNodes(target.root);
  if (scope) {
    const node = findTreeNode(target.root, scope);
    return [{ scope, label: node?.topic ?? target.title, nodes: node ? countNodes(node) : total }];
  }
  if (total <= CHUNK_THRESHOLD) return [{ scope: null, label: target.title, nodes: total }];
  const branches = topLevelBranches(target.root);
  if (branches.length < 2) return [{ scope: null, label: target.title, nodes: total }];
  return branches.map((branch) => ({
    scope: branch.id,
    label: branch.topic,
    nodes: countNodes(branch),
  }));
}

export interface MergeMeta {
  mapSignature: string;
  targetSignature: string;
}

/** Merge per-branch results into one comparison over the whole (or scoped) target. */
export function mergeResults(
  parts: ComparisonResult[],
  targetNodes: number,
  meta: MergeMeta,
): ComparisonResult {
  const matches = new Map<string, Match>();
  const gaps = new Map<string, GapSuggestion>();
  const extras = new Map<string, ExtraNode>();
  for (const part of parts) {
    for (const match of part.matches) if (!matches.has(match.targetId)) matches.set(match.targetId, match);
    for (const gap of part.gaps) if (!gaps.has(gap.signature)) gaps.set(gap.signature, gap);
    for (const extra of part.extras) if (!extras.has(extra.userNodeId)) extras.set(extra.userNodeId, extra);
  }
  const gapList = [...gaps.values()];
  const first = parts[0];
  return {
    id: first?.id ?? nanoid(10),
    createdAt: first?.createdAt ?? new Date().toISOString(),
    mapSignature: meta.mapSignature,
    targetSignature: meta.targetSignature,
    matches: [...matches.values()],
    gaps: gapList,
    extras: [...extras.values()].slice(0, 20),
    stats: computeStats(gapList, targetNodes),
    model: first?.model ?? { host: 'unknown', model: '' },
  };
}
