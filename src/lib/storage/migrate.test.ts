import { describe, expect, it } from 'vitest';
import { CURRENT_SCHEMA_VERSION, checkSchemaVersion, migrateWorkspace } from './migrate';

describe('checkSchemaVersion', () => {
  it('accepts the current version', () => {
    expect(checkSchemaVersion({ schemaVersion: CURRENT_SCHEMA_VERSION })).toEqual({ ok: true });
  });

  it('rejects a future version without clearing data', () => {
    expect(checkSchemaVersion({ schemaVersion: CURRENT_SCHEMA_VERSION + 1 })).toEqual({
      ok: false,
      reason: 'future-version',
      version: 2,
    });
  });

  it('rejects invalid shapes', () => {
    expect(checkSchemaVersion(null).ok).toBe(false);
    expect(checkSchemaVersion({}).ok).toBe(false);
    expect(checkSchemaVersion({ schemaVersion: 'x' }).ok).toBe(false);
  });
});

describe('migrateWorkspace', () => {
  it('is a passthrough at v1', () => {
    const value = { schemaVersion: 1, map: {} };
    expect(migrateWorkspace(value)).toBe(value);
  });
});
