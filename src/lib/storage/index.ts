export { STORAGE_KEYS, workspaceKey, historyKey } from './keys';
export type { StorageKey } from './keys';
export {
  CURRENT_SCHEMA_VERSION,
  checkSchemaVersion,
  migrateWorkspace,
  migrateLlmSettings,
  migrateHistory,
} from './migrate';
export type { VersionCheck } from './migrate';
export {
  INDEX_SCHEMA_VERSION,
  emptyIndex,
  loadIndex,
  saveIndex,
  loadWorkspaceById,
  saveWorkspaceById,
  deleteWorkspaceById,
  readRawWorkspace,
  createDefaultWorkspace,
} from './workspace';
export type { WorkspaceLoad, WorkspaceIndex, WorkspaceMeta } from './workspace';
export {
  DEFAULT_LLM_SETTINGS,
  loadLlmSettings,
  saveLlmSettings,
  clearLlmSettings,
  hasApiKey,
} from './llm';
export { HISTORY_LIMIT, loadHistory, saveHistory, pushHistory, clearHistory } from './history';
export { loadTheme, saveTheme } from './theme';
export { loadConsent, saveConsent, loadOnboarded, saveOnboarded } from './consent';
