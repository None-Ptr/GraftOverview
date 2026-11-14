import type { StoredPack } from './types';
import { STORAGE_KEYS } from '$lib/storage/keys';

function storage(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

function isStoredPack(value: unknown): value is StoredPack {
  if (typeof value !== 'object' || value === null) return false;
  const pack = value as Record<string, unknown>;
  return (
    pack.format === 'GraftOverviewTemplatePack' &&
    pack.version === 1 &&
    typeof pack.name === 'string' &&
    typeof pack.slug === 'string' &&
    typeof pack.license === 'string' &&
    Array.isArray(pack.templates)
  );
}

export function loadPacks(): StoredPack[] {
  const s = storage();
  if (!s) return [];
  try {
    const raw = s.getItem(STORAGE_KEYS.packs);
    if (raw === null) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(isStoredPack) : [];
  } catch {
    return [];
  }
}

export function savePacks(packs: StoredPack[]): void {
  const s = storage();
  if (!s) return;
  s.setItem(STORAGE_KEYS.packs, JSON.stringify(packs));
}
