import type { KnowledgeNode, NodeId } from '$lib/types';

export function findTreeNode(root: KnowledgeNode, id: NodeId): KnowledgeNode | null {
  if (root.id === id) return root;
  for (const child of root.children) {
    const found = findTreeNode(child, id);
    if (found) return found;
  }
  return null;
}

/** Top-level branches offered for a scoped comparison. */
export function topLevelBranches(root: KnowledgeNode): KnowledgeNode[] {
  return root.children;
}
