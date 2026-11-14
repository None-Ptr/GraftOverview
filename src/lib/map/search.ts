import type { KnowledgeMap, KnowledgeNode, NodeId } from '$lib/types';
import { normalizeText } from '$lib/signature';

export interface SearchResult {
  nodeId: NodeId;
  topic: string;
  path: string[];
}

/** NFKC + case-insensitive substring match over node titles, with ancestor path. */
export function searchNodes(map: KnowledgeMap, query: string): SearchResult[] {
  const needle = normalizeText(query);
  if (!needle) return [];
  const results: SearchResult[] = [];
  const walk = (node: KnowledgeNode, ancestors: string[]): void => {
    const path = [...ancestors, node.topic];
    if (normalizeText(node.topic).includes(needle)) {
      results.push({ nodeId: node.id, topic: node.topic, path });
    }
    for (const child of node.children) walk(child, path);
  };
  walk(map.root, []);
  return results;
}
