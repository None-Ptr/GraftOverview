import { compressToEncodedURIComponent } from 'lz-string';
import type { SharePayload, Workspace } from '$lib/types';

/** §3.4 — the encoded payload must stay under this many characters. */
export const SHARE_LIMIT = 12_000;

export function buildSharePayload(workspace: Workspace): SharePayload | null {
  if (!workspace.target) return null;
  return { v: 1, m: workspace.map, t: workspace.target };
}

export function encodeShare(payload: SharePayload): string {
  return compressToEncodedURIComponent(JSON.stringify(payload));
}

export function shareUrl(encoded: string): string {
  const base =
    typeof window === 'undefined'
      ? ''
      : `${window.location.origin}${window.location.pathname}${window.location.search}`;
  return `${base}#/share?d=${encoded}`;
}
