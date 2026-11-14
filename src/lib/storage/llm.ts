import type { StoredLlmSettings } from '../types';
import { STORAGE_KEYS } from './keys';
import { checkSchemaVersion, migrateLlmSettings } from './migrate';

function storage(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

export const DEFAULT_LLM_SETTINGS: StoredLlmSettings = {
  schemaVersion: 1,
  presetId: 'openai',
  baseUrl: 'https://api.openai.com/v1',
  apiKey: '',
  model: 'gpt-4o-mini',
  temperature: 0.2,
  maxTokens: 4096,
  jsonMode: true,
  compactPrompt: false,
};

function isSettings(value: unknown): value is StoredLlmSettings {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.presetId === 'string' &&
    typeof v.baseUrl === 'string' &&
    typeof v.apiKey === 'string' &&
    typeof v.model === 'string' &&
    typeof v.temperature === 'number' &&
    typeof v.maxTokens === 'number' &&
    typeof v.jsonMode === 'boolean'
  );
}

export function loadLlmSettings(): StoredLlmSettings {
  const s = storage();
  if (!s) return { ...DEFAULT_LLM_SETTINGS };
  try {
    const raw = s.getItem(STORAGE_KEYS.llm);
    if (raw === null) return { ...DEFAULT_LLM_SETTINGS };
    const parsed: unknown = JSON.parse(raw);
    const check = checkSchemaVersion(parsed);
    if (!check.ok) return { ...DEFAULT_LLM_SETTINGS };
    const migrated = migrateLlmSettings(parsed);
    if (!isSettings(migrated)) return { ...DEFAULT_LLM_SETTINGS };
    // Optional since v0.4; stored settings without it default to off.
    return { ...migrated, compactPrompt: migrated.compactPrompt === true };
  } catch {
    return { ...DEFAULT_LLM_SETTINGS };
  }
}

export function saveLlmSettings(settings: StoredLlmSettings): void {
  const s = storage();
  if (!s) return;
  s.setItem(STORAGE_KEYS.llm, JSON.stringify(settings));
}

export function clearLlmSettings(): void {
  const s = storage();
  if (!s) return;
  s.removeItem(STORAGE_KEYS.llm);
}

/** True when a key is configured. Used to gate the compare button. */
export function hasApiKey(settings: StoredLlmSettings): boolean {
  return settings.apiKey.trim().length > 0;
}
