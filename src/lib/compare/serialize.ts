import type { KnowledgeMap, KnowledgeNode, NodeId, TargetSystem } from '$lib/types';

export interface PromptIndex {
  /** short id -> real NodeId */
  target: Map<string, NodeId>;
  user: Map<string, NodeId>;
  /** real NodeId -> short id */
  targetShort: Map<NodeId, string>;
  userShort: Map<NodeId, string>;
  targetDepth: Map<string, number>;
  targetParent: Map<string, string | null>;
  /** short id -> size of its whole subtree (used for gap.nodeCount) */
  subtreeSize: Map<string, number>;
  targetNodes: number;
  userNodes: number;
}

export interface SerializedTrees {
  targetText: string;
  userText: string;
  index: PromptIndex;
}

function cleanCell(value: string): string {
  return value.replace(/\|/g, '／').replace(/[\r\n]+/g, ' ').trim();
}

function walk(
  node: KnowledgeNode,
  depth: number,
  prefix: 't' | 'u',
  lines: string[],
  index: PromptIndex,
  includeNote: boolean,
  parentShort: string | null,
): number {
  const map = prefix === 't' ? index.target : index.user;
  const reverse = prefix === 't' ? index.targetShort : index.userShort;
  const short = `${prefix}${map.size + 1}`;
  map.set(short, node.id);
  reverse.set(node.id, short);
  if (prefix === 't') {
    index.targetDepth.set(short, depth);
    index.targetParent.set(short, parentShort);
  }
  const note = includeNote ? cleanCell((node.note ?? '').slice(0, 60)) : '';
  lines.push(`${short}|${depth}|${cleanCell(node.topic)}|${note}`);
  let size = 1;
  for (const child of node.children) {
    size += walk(child, depth + 1, prefix, lines, index, includeNote, short);
  }
  if (prefix === 't') index.subtreeSize.set(short, size);
  return size;
}

export interface SerializeOptions {
  /** Target notes help matching but cost tokens; compact mode drops them. */
  includeTargetNotes?: boolean;
}

/**
 * Canonical trees -> compact `id|depth|topic|note` lines (§4.4).
 * User notes are intentionally NOT sent; target notes are truncated to 60 chars.
 * The LLM only ever sees short `t*`/`u*` ids.
 */
export function serializeTrees(
  target: TargetSystem,
  map: KnowledgeMap,
  options: SerializeOptions = {},
): SerializedTrees {
  const includeTargetNotes = options.includeTargetNotes ?? true;
  const index: PromptIndex = {
    target: new Map(),
    user: new Map(),
    targetShort: new Map(),
    userShort: new Map(),
    targetDepth: new Map(),
    targetParent: new Map(),
    subtreeSize: new Map(),
    targetNodes: 0,
    userNodes: 0,
  };
  const targetLines: string[] = [];
  const userLines: string[] = [];
  index.targetNodes = walk(target.root, 0, 't', targetLines, index, includeTargetNotes, null);
  index.userNodes = walk(map.root, 0, 'u', userLines, index, false, null);
  return {
    targetText: targetLines.join('\n'),
    userText: userLines.join('\n'),
    index,
  };
}

export function countNodes(node: KnowledgeNode): number {
  return 1 + node.children.reduce((sum, child) => sum + countNodes(child), 0);
}

export function indexNodes(root: KnowledgeNode): Map<NodeId, KnowledgeNode> {
  const byId = new Map<NodeId, KnowledgeNode>();
  const visit = (node: KnowledgeNode): void => {
    byId.set(node.id, node);
    for (const child of node.children) visit(child);
  };
  visit(root);
  return byId;
}
