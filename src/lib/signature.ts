import type { KnowledgeMap, KnowledgeNode, Locale, NodeId, TargetSystem } from './types';

/** 32-bit FNV-1a, hex encoded. Stable and dependency-free. */
export function fnv1a(input: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}

export function normalizeText(s: string, locale: Locale = 'zh'): string {
  return s
    .normalize('NFKC')
    .trim()
    .replace(/\s+/g, ' ')
    .toLocaleLowerCase(locale);
}

export interface SignatureNode {
  t: string;
  c: SignatureNode[];
}

/** Normalized tree used for map/target signatures (structure + normalized topics). */
export function signatureTree(root: KnowledgeNode, locale: Locale = 'zh'): SignatureNode {
  return {
    t: normalizeText(root.topic, locale),
    c: root.children.map((child) => signatureTree(child, locale)),
  };
}

export function pathSignature(topics: string[], locale: Locale = 'zh'): string {
  return fnv1a(topics.map((s) => normalizeText(s, locale)).join(' / '));
}

export function mapSignature(map: KnowledgeMap, locale: Locale = 'zh'): string {
  return fnv1a(JSON.stringify(signatureTree(map.root, locale)));
}

export function targetSignature(target: TargetSystem, locale: Locale = 'zh'): string {
  return fnv1a(JSON.stringify(signatureTree(target.root, locale)));
}

/** Map of node id -> path signature. Used by A3 to derive gap signatures. */
export function nodePathSignatures(
  root: KnowledgeNode,
  locale: Locale = 'zh',
): Map<NodeId, string> {
  const out = new Map<NodeId, string>();
  const walk = (node: KnowledgeNode, ancestors: string[]): void => {
    const path = [...ancestors, node.topic];
    out.set(node.id, pathSignature(path, locale));
    for (const child of node.children) walk(child, path);
  };
  walk(root, []);
  return out;
}
