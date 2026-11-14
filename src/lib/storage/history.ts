import type { HistoryEntry } from '../types';
import { historyKey } from './keys';

export const HISTORY_LIMIT = 10;

function storage(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

function isHistoryEntry(value: unknown): value is HistoryEntry {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.id === 'string' &&
    typeof v.createdAt === 'string' &&
    typeof v.targetTitle === 'string' &&
    typeof v.mapTitle === 'string' &&
    typeof v.stats === 'object' &&
    typeof v.result === 'object'
  );
}

export function loadHistory(workspaceId: string): HistoryEntry[] {
  const s = storage();
  if (!s) return [];
  try {
    const raw = s.getItem(historyKey(workspaceId));
    if (raw === null) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isHistoryEntry).slice(0, HISTORY_LIMIT);
  } catch {
    return [];
  }
}

export function saveHistory(workspaceId: string, entries: HistoryEntry[]): void {
  const s = storage();
  if (!s) return;
  s.setItem(historyKey(workspaceId), JSON.stringify(entries.slice(0, HISTORY_LIMIT)));
}

/** Prepend an entry for one workspace, cap at 10, persist, and return the new list. */
export function pushHistory(workspaceId: string, entry: HistoryEntry): HistoryEntry[] {
  const next = [entry, ...loadHistory(workspaceId)].slice(0, HISTORY_LIMIT);
  saveHistory(workspaceId, next);
  return next;
}

export function clearHistory(workspaceId: string): void {
  const s = storage();
  if (!s) return;
  s.removeItem(historyKey(workspaceId));
}
