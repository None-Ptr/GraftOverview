import { nanoid } from 'nanoid';
import type { KnowledgeNode, Locale, PanelTab, Workspace } from '../types';
import { STORAGE_KEYS, workspaceKey } from './keys';
import { checkSchemaVersion, migrateWorkspace } from './migrate';

export interface WorkspaceMeta {
  id: string;
  title: string;
  updatedAt: string;
}

export interface WorkspaceIndex {
  schemaVersion: 2;
  activeId: string | null;
  items: WorkspaceMeta[];
}

export const INDEX_SCHEMA_VERSION = 2;

export type WorkspaceLoad =
  | { status: 'ok'; workspace: Workspace }
  | { status: 'empty' }
  | { status: 'corrupt'; raw: string }
  | { status: 'future-version'; raw: string; version: number };

function storage(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isMeta(value: unknown): value is WorkspaceMeta {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    value.id.length > 0 &&
    typeof value.title === 'string' &&
    typeof value.updatedAt === 'string'
  );
}

export function emptyIndex(): WorkspaceIndex {
  return { schemaVersion: INDEX_SCHEMA_VERSION, activeId: null, items: [] };
}

export function loadIndex(): WorkspaceIndex {
  const s = storage();
  if (!s) return emptyIndex();
  try {
    const raw = s.getItem(STORAGE_KEYS.index);
    if (raw === null) return emptyIndex();
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed)) return emptyIndex();
    const items = Array.isArray(parsed.items) ? parsed.items.filter(isMeta) : [];
    const activeCandidate = typeof parsed.activeId === 'string' ? parsed.activeId : null;
    const activeId =
      activeCandidate && items.some((item) => item.id === activeCandidate)
        ? activeCandidate
        : (items[0]?.id ?? null);
    return { schemaVersion: INDEX_SCHEMA_VERSION, activeId, items };
  } catch {
    return emptyIndex();
  }
}

export function saveIndex(index: WorkspaceIndex): void {
  const s = storage();
  if (!s) return;
  s.setItem(STORAGE_KEYS.index, JSON.stringify(index));
}

export function readRawWorkspace(id: string): string | null {
  const s = storage();
  if (!s) return null;
  try {
    return s.getItem(workspaceKey(id));
  } catch {
    return null;
  }
}

function isNode(value: unknown): value is KnowledgeNode {
  if (typeof value !== 'object' || value === null) return false;
  const n = value as Record<string, unknown>;
  return (
    typeof n.id === 'string' &&
    typeof n.topic === 'string' &&
    Array.isArray(n.children) &&
    n.children.every(isNode)
  );
}

function isWorkspace(value: unknown): value is Workspace {
  if (typeof value !== 'object' || value === null) return false;
  const w = value as Record<string, unknown>;
  if (typeof w.map !== 'object' || w.map === null) return false;
  const map = w.map as Record<string, unknown>;
  if (typeof map.id !== 'string' || typeof map.title !== 'string' || !isNode(map.root)) return false;
  if (typeof w.ui !== 'object' || w.ui === null) return false;
  const ui = w.ui as Record<string, unknown>;
  if (ui.locale !== 'zh' && ui.locale !== 'en') return false;
  if (ui.panelTab !== 'target' && ui.panelTab !== 'suggestions' && ui.panelTab !== 'history') {
    return false;
  }
  if (!Array.isArray(w.ignoredSignatures)) return false;
  if (w.target !== null && typeof w.target !== 'object') return false;
  if (w.comparison !== null && typeof w.comparison !== 'object') return false;
  return true;
}

export function loadWorkspaceById(id: string): WorkspaceLoad {
  const raw = readRawWorkspace(id);
  if (raw === null) return { status: 'empty' };
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { status: 'corrupt', raw };
  }
  const check = checkSchemaVersion(parsed);
  if (!check.ok) {
    if (check.reason === 'future-version') {
      return { status: 'future-version', raw, version: check.version };
    }
    return { status: 'corrupt', raw };
  }
  const migrated = migrateWorkspace(parsed);
  if (!isWorkspace(migrated)) return { status: 'corrupt', raw };
  return { status: 'ok', workspace: migrated };
}

export function saveWorkspaceById(id: string, workspace: Workspace): void {
  const s = storage();
  if (!s) return;
  s.setItem(workspaceKey(id), JSON.stringify(workspace));
}

export function deleteWorkspaceById(id: string): void {
  const s = storage();
  if (!s) return;
  s.removeItem(workspaceKey(id));
}

export function createDefaultWorkspace(locale: Locale = 'zh', title = '我的知识导图'): Workspace {
  const now = new Date().toISOString();
  const id = nanoid(10);
  const root: KnowledgeNode = { id: 'root', topic: title, children: [] };
  return {
    schemaVersion: 1,
    map: { id, title, root, updatedAt: now },
    target: null,
    comparison: null,
    ignoredSignatures: [],
    ui: { locale, panelTab: 'target' as PanelTab },
  };
}
