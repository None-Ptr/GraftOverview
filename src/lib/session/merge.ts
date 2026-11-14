import { nanoid } from 'nanoid';
import type { KnowledgeNode, Locale } from '$lib/types';
import { normalizeText } from '$lib/signature';

function cloneWithNewIds(node: KnowledgeNode): KnowledgeNode {
  return {
    id: nanoid(8),
    topic: node.topic,
    ...(node.note !== undefined ? { note: node.note } : {}),
    children: node.children.map(cloneWithNewIds),
  };
}

/**
 * Merge a test attempt into the user's map: matching children (normalized
 * topic) are merged recursively, new branches are appended with fresh ids.
 */
export function mergeTrees(
  base: KnowledgeNode,
  incoming: KnowledgeNode,
  locale: Locale,
): KnowledgeNode {
  let children = [...base.children];
  for (const child of incoming.children) {
    const wanted = normalizeText(child.topic, locale);
    const index = children.findIndex((existing) => normalizeText(existing.topic, locale) === wanted);
    if (index >= 0) {
      children[index] = mergeTrees(children[index], child, locale);
    } else {
      children = [...children, cloneWithNewIds(child)];
    }
  }
  return { ...base, children };
}
