export const STORAGE_KEYS = {
  /** Index of all workspaces: { schemaVersion: 2, activeId, items: [{ id, title, updatedAt }] } */
  index: 'graft.workspaces.v2',
  /** Per-workspace document: graft.workspace.v2.<id> */
  workspacePrefix: 'graft.workspace.v2.',
  /** Per-workspace comparison history: graft.history.v2.<id> */
  historyPrefix: 'graft.history.v2.',
  llm: 'graft.llm.v1',
  theme: 'graft.theme',
  consent: 'graft.consent.v1',
  onboarded: 'graft.onboarded',
  /** Imported community template packs (global). */
  packs: 'graft.packs.v2',
} as const;

export type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS];

export function workspaceKey(id: string): string {
  return STORAGE_KEYS.workspacePrefix + id;
}

export function historyKey(id: string): string {
  return STORAGE_KEYS.historyPrefix + id;
}
