import { nanoid } from 'nanoid';
import type { KnowledgeMap, KnowledgeNode, NodeId } from '$lib/types';

export function cloneNode(node: KnowledgeNode): KnowledgeNode {
  const out: KnowledgeNode = {
    id: node.id,
    topic: node.topic,
    children: node.children.map(cloneNode),
  };
  if (node.note !== undefined) out.note = node.note;
  if (node.collapsed) out.collapsed = true;
  return out;
}

export function cloneMap(map: KnowledgeMap): KnowledgeMap {
  return { ...map, root: cloneNode(map.root) };
}

export function countNodes(node: KnowledgeNode): number {
  return 1 + node.children.reduce((sum, child) => sum + countNodes(child), 0);
}

export function findNode(root: KnowledgeNode, id: NodeId): KnowledgeNode | null {
  if (root.id === id) return root;
  for (const child of root.children) {
    const found = findNode(child, id);
    if (found) return found;
  }
  return null;
}

/** Recursively rebuild the tree, applying `transform` at `targetId`. `null` deletes the node. */
function rewrite(
  node: KnowledgeNode,
  targetId: NodeId,
  transform: (n: KnowledgeNode) => KnowledgeNode | null,
): KnowledgeNode | null {
  if (node.id === targetId) return transform(node);
  let changed = false;
  const children: KnowledgeNode[] = [];
  for (const child of node.children) {
    const next = rewrite(child, targetId, transform);
    if (next !== child) changed = true;
    if (next !== null) children.push(next);
  }
  if (!changed) return node;
  return { ...node, children };
}

function withRoot(map: KnowledgeMap, root: KnowledgeNode | null): KnowledgeMap {
  if (root === null) return map;
  return { ...map, root, updatedAt: new Date().toISOString() };
}

export function addChild(map: KnowledgeMap, parentId: NodeId, topic: string): KnowledgeMap {
  const node: KnowledgeNode = { id: nanoid(8), topic, children: [] };
  return withRoot(
    map,
    rewrite(map.root, parentId, (n) => ({
      ...n,
      collapsed: false,
      children: [...n.children, node],
    })),
  );
}

export function addSibling(map: KnowledgeMap, siblingId: NodeId, topic: string): KnowledgeMap {
  if (map.root.id === siblingId) return addChild(map, map.root.id, topic);
  const node: KnowledgeNode = { id: nanoid(8), topic, children: [] };
  let inserted = false;
  const walk = (n: KnowledgeNode): KnowledgeNode => {
    const idx = n.children.findIndex((child) => child.id === siblingId);
    if (idx >= 0) {
      inserted = true;
      const children = [...n.children];
      children.splice(idx + 1, 0, node);
      return { ...n, collapsed: false, children };
    }
    const children = n.children.map(walk);
    return children.some((c, i) => c !== n.children[i]) ? { ...n, children } : n;
  };
  const root = walk(map.root);
  return inserted ? withRoot(map, root) : map;
}

export function renameNode(map: KnowledgeMap, id: NodeId, topic: string): KnowledgeMap {
  return withRoot(
    map,
    rewrite(map.root, id, (n) => ({ ...n, topic })),
  );
}

export function removeNode(map: KnowledgeMap, id: NodeId): KnowledgeMap {
  if (map.root.id === id) return map; // root cannot be deleted
  return withRoot(map, rewrite(map.root, id, () => null));
}

export function toggleCollapse(map: KnowledgeMap, id: NodeId): KnowledgeMap {
  return withRoot(
    map,
    rewrite(map.root, id, (n) => ({ ...n, collapsed: !n.collapsed })),
  );
}
