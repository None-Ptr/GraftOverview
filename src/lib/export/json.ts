import type { KnowledgeNode, Workspace } from '$lib/types';

export interface ProjectFile {
  app: 'GraftOverview';
  schemaVersion: 1;
  exportedAt: string;
  workspace: Workspace;
}

export type ProjectParse =
  | { ok: true; workspace: Workspace }
  | { ok: false; reason: 'invalid' | 'future-version' };

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

function isWorkspace(value: unknown): value is Workspace {
  if (typeof value !== 'object' || value === null) return false;
  const workspace = value as Record<string, unknown>;
  if (typeof workspace.map !== 'object' || workspace.map === null) return false;
  const map = workspace.map as Record<string, unknown>;
  if (typeof map.id !== 'string' || typeof map.title !== 'string' || !isNode(map.root)) return false;
  if (typeof workspace.ui !== 'object' || workspace.ui === null) return false;
  const ui = workspace.ui as Record<string, unknown>;
  if (ui.locale !== 'zh' && ui.locale !== 'en') return false;
  return (
    Array.isArray(workspace.ignoredSignatures) &&
    (workspace.target === null || typeof workspace.target === 'object') &&
    (workspace.comparison === null || typeof workspace.comparison === 'object')
  );
}

/** §3.5 project file. Never contains the API key or history. */
export function serializeProject(workspace: Workspace): string {
  const file: ProjectFile = {
    app: 'GraftOverview',
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    workspace,
  };
  return JSON.stringify(file, null, 2);
}

export function parseProject(raw: string): ProjectParse {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, reason: 'invalid' };
  }
  if (typeof parsed !== 'object' || parsed === null) return { ok: false, reason: 'invalid' };
  const file = parsed as Record<string, unknown>;
  if (file.app !== 'GraftOverview') return { ok: false, reason: 'invalid' };
  if (typeof file.schemaVersion !== 'number') return { ok: false, reason: 'invalid' };
  if (file.schemaVersion > 1) return { ok: false, reason: 'future-version' };
  if (!isWorkspace(file.workspace)) return { ok: false, reason: 'invalid' };
  return { ok: true, workspace: file.workspace };
}
