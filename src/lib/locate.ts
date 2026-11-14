import type {
  ComparisonResult,
  GhostTree,
  KnowledgeMap,
  KnowledgeNode,
  Locale,
  NodeId,
  TargetSystem,
} from './types';
import { normalizeText } from './signature';

/** Shared ghost id convention (A1 renders, A4 builds, both filter on export). */
export const GHOST_PREFIX = 'ghost-';

export function ghostId(targetId: NodeId): NodeId {
  return GHOST_PREFIX + targetId;
}

export function isGhostId(id: NodeId): boolean {
  return id.startsWith(GHOST_PREFIX);
}

export function stripGhostPrefix(id: NodeId): NodeId {
  return isGhostId(id) ? id.slice(GHOST_PREFIX.length) : id;
}

export interface LocateResult {
  nodeId: NodeId;
  kind: 'user' | 'ghost';
}

function containsId(node: KnowledgeNode, id: NodeId): boolean {
  if (node.id === id) return true;
  return node.children.some((child) => containsId(child, id));
}

/**
 * Given a target node id, find the corresponding canvas node:
 * a ghost node first (highest-priority gaps), else a matched user node.
 */
export function locateTarget(
  targetId: NodeId,
  comparison: ComparisonResult | null,
  ghostTrees: GhostTree[],
): LocateResult | null {
  const gid = ghostId(targetId);
  for (const tree of ghostTrees) {
    if (containsId(tree.root, gid)) return { nodeId: gid, kind: 'ghost' };
  }
  if (comparison) {
    const match = comparison.matches.find((m) => m.targetId === targetId);
    if (match) return { nodeId: match.userNodeId, kind: 'user' };
  }
  return null;
}

function findNode(node: KnowledgeNode, id: NodeId): KnowledgeNode | null {
  if (node.id === id) return node;
  for (const child of node.children) {
    const found = findNode(child, id);
    if (found) return found;
  }
  return null;
}

/** Depth-first search for a node with the same normalized topic. */
export function findNodeByTopic(
  node: KnowledgeNode,
  topic: string,
  locale: Locale,
): NodeId | null {
  const wanted = normalizeText(topic, locale);
  if (normalizeText(node.topic, locale) === wanted) return node.id;
  for (const child of node.children) {
    const found = findNodeByTopic(child, topic, locale);
    if (found) return found;
  }
  return null;
}

/**
 * Resolve a target node to something on the canvas.
 *
 * Ghost (a drawn gap) and matched nodes come first. Before any comparison —
 * or for target nodes the comparison said nothing about — fall back to the
 * first canvas node with the same topic, which keeps "locate" useful for
 * drafts, adopted gaps and freshly imported templates.
 */
export function locateInMap(
  targetId: NodeId,
  target: TargetSystem | null,
  map: KnowledgeMap,
  comparison: ComparisonResult | null,
  ghostTrees: GhostTree[],
  locale: Locale,
): LocateResult | null {
  // Search popovers pass a canvas id directly.
  if (findNode(map.root, targetId)) return { nodeId: targetId, kind: 'user' };

  const direct = locateTarget(targetId, comparison, ghostTrees);
  if (direct) return direct;
  if (!target) return null;
  const targetNode = findNode(target.root, targetId);
  if (!targetNode) return null;
  const byTopic = findNodeByTopic(map.root, targetNode.topic, locale);
  return byTopic ? { nodeId: byTopic, kind: 'user' } : null;
}
