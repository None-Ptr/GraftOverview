import { decompressFromEncodedURIComponent } from 'lz-string';
import type { KnowledgeNode, SharePayload } from '$lib/types';

function isNode(value: unknown): value is KnowledgeNode {
  if (typeof value !== 'object' || value === null) return false;
  const node = value as Record<string, unknown>;
  return (
    typeof node.id === 'string' &&
    typeof node.topic === 'string' &&
    Array.isArray(node.children) &&
    node.children.every(isNode)
  );
}

function isMapLike(value: unknown): boolean {
  if (typeof value !== 'object' || value === null) return false;
  const map = value as Record<string, unknown>;
  return (
    typeof map.id === 'string' &&
    typeof map.title === 'string' &&
    isNode(map.root)
  );
}

/** §3.4 — decode a share link; any corruption returns null. */
export function decodeShare(data: string | null): SharePayload | null {
  if (!data) return null;
  try {
    const json = decompressFromEncodedURIComponent(data);
    if (!json) return null;
    const parsed = JSON.parse(json) as unknown;
    if (typeof parsed !== 'object' || parsed === null) return null;
    const payload = parsed as Record<string, unknown>;
    if (payload.v !== 1) return null;
    if (!isMapLike(payload.m) || !isMapLike(payload.t)) return null;
    return parsed as SharePayload;
  } catch {
    return null;
  }
}
