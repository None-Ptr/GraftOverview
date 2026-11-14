import type { MindElixirData, NodeObj } from 'mind-elixir';
import type { GhostTree, KnowledgeMap, KnowledgeNode, NodeId } from '$lib/types';
import { isGhostId } from '$lib/locate';

/** mind-elixir has no note/collapsed fields; we carry them as typed extras. */
export type MeNode = NodeObj & { note?: string; collapsed?: boolean };

interface MapMeta {
  id?: string;
  title?: string;
  updatedAt?: string;
}

function toMe(node: KnowledgeNode): MeNode {
  const out: MeNode = {
    id: node.id,
    topic: node.topic,
    children: node.children.map(toMe),
    expanded: !node.collapsed,
  };
  if (node.note !== undefined) out.note = node.note;
  if (node.collapsed) out.collapsed = true;
  return out;
}

function fromMe(node: MeNode): KnowledgeNode {
  const out: KnowledgeNode = {
    id: node.id,
    topic: node.topic,
    children: (node.children ?? [])
      .filter((child) => !isGhostId(child.id))
      .map((child) => fromMe(child as MeNode)),
  };
  if (node.note !== undefined) out.note = node.note;
  if (node.collapsed || node.expanded === false) out.collapsed = true;
  return out;
}

function index(root: MeNode): Map<NodeId, MeNode> {
  const byId = new Map<NodeId, MeNode>();
  const walk = (node: MeNode): void => {
    byId.set(node.id, node);
    for (const child of node.children ?? []) walk(child as MeNode);
  };
  walk(root);
  return byId;
}

/**
 * Canonical map -> mind-elixir data. Ghost trees are appended as extra child
 * subtrees; their ids are already `ghost-` prefixed (see $lib/locate.ts).
 * The canonical map itself is never mutated.
 */
export function toMindElixirData(map: KnowledgeMap, ghostTrees: GhostTree[]): MindElixirData {
  const root = toMe(map.root);
  const byId = index(root);
  for (const tree of ghostTrees) {
    const ghostRoot = toMe(tree.root);
    const parent = (tree.parentId && byId.get(tree.parentId)) || root;
    parent.children = [...(parent.children ?? []), ghostRoot];
  }
  return {
    nodeData: root,
    direction: 1,
    meta: { id: map.id, title: map.title, updatedAt: map.updatedAt },
  } as MindElixirData;
}

/** mind-elixir data -> canonical map. Every `ghost-` node is dropped. */
export function fromMindElixirData(data: MindElixirData, base?: KnowledgeMap): KnowledgeMap {
  const meta = (data.meta ?? {}) as MapMeta;
  const root = fromMe(data.nodeData as MeNode);
  return {
    id: meta.id ?? base?.id ?? 'map',
    title: meta.title ?? base?.title ?? '',
    updatedAt: meta.updatedAt ?? base?.updatedAt ?? new Date().toISOString(),
    root,
  };
}
