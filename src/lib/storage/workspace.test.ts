import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createDefaultWorkspace,
  deleteWorkspaceById,
  emptyIndex,
  loadIndex,
  loadWorkspaceById,
  readRawWorkspace,
  saveIndex,
  saveWorkspaceById,
} from './workspace';
import { STORAGE_KEYS, workspaceKey } from './keys';

function makeMemoryStorage(): Storage {
  const data = new Map<string, string>();
  return {
    get length() {
      return data.size;
    },
    clear: () => data.clear(),
    getItem: (key: string) => data.get(key) ?? null,
    key: (index: number) => [...data.keys()][index] ?? null,
    removeItem: (key: string) => data.delete(key),
    setItem: (key: string, value: string) => void data.set(key, value),
  } as Storage;
}

beforeEach(() => {
  vi.stubGlobal('localStorage', makeMemoryStorage());
});

describe('workspace index', () => {
  it('is empty when nothing is stored', () => {
    expect(loadIndex()).toEqual(emptyIndex());
  });

  it('round-trips items and repairs an unknown activeId', () => {
    saveIndex({
      schemaVersion: 2,
      activeId: 'missing',
      items: [
        { id: 'a', title: 'A', updatedAt: '2026-01-01T00:00:00.000Z' },
        { id: 'b', title: 'B', updatedAt: '2026-01-02T00:00:00.000Z' },
      ],
    });
    const loaded = loadIndex();
    expect(loaded.items).toHaveLength(2);
    expect(loaded.activeId).toBe('a'); // falls back to the first item
  });

  it('drops malformed items and survives corrupt JSON', () => {
    localStorage.setItem(STORAGE_KEYS.index, JSON.stringify({ activeId: 'x', items: [{ id: 'x' }, 3] }));
    expect(loadIndex().items).toEqual([]);
    localStorage.setItem(STORAGE_KEYS.index, '{bad');
    expect(loadIndex()).toEqual(emptyIndex());
  });
});

describe('per-workspace documents', () => {
  it('generates a unique map id per workspace', () => {
    const a = createDefaultWorkspace();
    const b = createDefaultWorkspace();
    expect(a.map.id).not.toBe(b.map.id);
  });

  it('round-trips by id', () => {
    const ws = createDefaultWorkspace();
    saveWorkspaceById(ws.map.id, ws);
    expect(loadWorkspaceById(ws.map.id)).toEqual({ status: 'ok', workspace: ws });
  });

  it('reports empty for an unknown id', () => {
    expect(loadWorkspaceById('nope')).toEqual({ status: 'empty' });
  });

  it('reports corrupt JSON without clearing it', () => {
    const ws = createDefaultWorkspace();
    localStorage.setItem(workspaceKey(ws.map.id), '{not json');
    const result = loadWorkspaceById(ws.map.id);
    expect(result.status).toBe('corrupt');
    expect(readRawWorkspace(ws.map.id)).toBe('{not json');
  });

  it('reports a future version without clearing it', () => {
    const ws = createDefaultWorkspace();
    localStorage.setItem(workspaceKey(ws.map.id), JSON.stringify({ schemaVersion: 999 }));
    const result = loadWorkspaceById(ws.map.id);
    expect(result.status).toBe('future-version');
    if (result.status === 'future-version') expect(result.version).toBe(999);
  });

  it('deletes only the addressed workspace', () => {
    const a = createDefaultWorkspace();
    const b = createDefaultWorkspace();
    saveWorkspaceById(a.map.id, a);
    saveWorkspaceById(b.map.id, b);
    deleteWorkspaceById(a.map.id);
    expect(loadWorkspaceById(a.map.id).status).toBe('empty');
    expect(loadWorkspaceById(b.map.id).status).toBe('ok');
  });
});
