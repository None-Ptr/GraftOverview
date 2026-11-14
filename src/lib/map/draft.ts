import { nanoid } from 'nanoid';
import type { KnowledgeMap, KnowledgeNode, TargetSystem } from '$lib/types';

function cloneAsDraft(node: KnowledgeNode): KnowledgeNode {
  return {
    id: nanoid(8),
    topic: node.topic,
    ...(node.note !== undefined ? { note: node.note } : {}),
    children: node.children.map(cloneAsDraft),
  };
}

/**
 * Copy a target system into the user's map as a draft (§2.4 "从目标生成初稿").
 * Fresh ids, deep copy; the user then deletes what they do not know.
 */
export function targetAsDraftMap(target: TargetSystem, base?: KnowledgeMap): KnowledgeMap {
  return {
    id: base?.id ?? nanoid(10),
    title: target.title.slice(0, 60),
    updatedAt: new Date().toISOString(),
    root: cloneAsDraft(target.root),
  };
}
