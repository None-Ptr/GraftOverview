/** Central schema version + migration logic (§3.3). Every schema change adds a migration + test. */
export const CURRENT_SCHEMA_VERSION = 1;

export type VersionCheck =
  | { ok: true }
  | { ok: false; reason: 'future-version'; version: number }
  | { ok: false; reason: 'invalid' };

export function checkSchemaVersion(value: unknown): VersionCheck {
  if (typeof value !== 'object' || value === null || !('schemaVersion' in value)) {
    return { ok: false, reason: 'invalid' };
  }
  const raw = (value as { schemaVersion: unknown }).schemaVersion;
  if (typeof raw !== 'number' || !Number.isInteger(raw) || raw < 1) {
    return { ok: false, reason: 'invalid' };
  }
  if (raw > CURRENT_SCHEMA_VERSION) {
    return { ok: false, reason: 'future-version', version: raw };
  }
  return { ok: true };
}

/**
 * Migrate a v1-shaped object to the current shape. Currently a passthrough;
 * future versions add explicit, tested branches here.
 */
export function migrateWorkspace(value: unknown): unknown {
  return value;
}

export function migrateLlmSettings(value: unknown): unknown {
  return value;
}

export function migrateHistory(value: unknown): unknown {
  return value;
}
