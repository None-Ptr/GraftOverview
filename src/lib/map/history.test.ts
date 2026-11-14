import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { KnowledgeMap } from '$lib/types';
import { MAX_UNDO_STEPS, mapHistory } from './history.svelte';

const makeMap = (topic: string): KnowledgeMap => ({
  id: 'm',
  title: topic,
  updatedAt: '2026-01-01T00:00:00.000Z',
  root: { id: 'root', topic, children: [] },
});

beforeEach(() => {
  mapHistory.clear();
  vi.useFakeTimers();
  vi.setSystemTime(0);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('mapHistory', () => {
  it('starts empty', () => {
    expect(mapHistory.canUndo).toBe(false);
    expect(mapHistory.canRedo).toBe(false);
    expect(mapHistory.undo(makeMap('now'))).toBeNull();
  });

  it('undo/redo round-trips with the current state', () => {
    const before = makeMap('before');
    const after = makeMap('after');
    mapHistory.push(before);
    expect(mapHistory.canUndo).toBe(true);

    const undone = mapHistory.undo(after);
    expect(undone?.title).toBe('before');
    expect(mapHistory.canRedo).toBe(true);

    const redone = mapHistory.redo(undone ?? before);
    expect(redone?.title).toBe('after');
  });

  it('clones snapshots so later mutations cannot corrupt history', () => {
    const before = makeMap('before');
    mapHistory.push(before);
    before.root.topic = 'mutated';
    expect(mapHistory.undo(makeMap('now'))?.root.topic).toBe('before');
  });

  it('caps at MAX_UNDO_STEPS', () => {
    for (let i = 0; i < MAX_UNDO_STEPS + 10; i += 1) {
      vi.setSystemTime(i * 1000);
      mapHistory.push(makeMap(`m${i}`));
    }
    let count = 0;
    while (mapHistory.undo(makeMap('now')) !== null) count += 1;
    expect(count).toBe(MAX_UNDO_STEPS);
  });

  it('merges rapid edits with the same key', () => {
    mapHistory.push(makeMap('a'), 'edit');
    vi.setSystemTime(100);
    mapHistory.push(makeMap('b'), 'edit');
    expect(mapHistory.undo(makeMap('now'))).not.toBeNull();
    expect(mapHistory.undo(makeMap('now'))).toBeNull();
  });

  it('does not merge edits beyond the time window', () => {
    mapHistory.push(makeMap('a'), 'edit');
    vi.setSystemTime(1000);
    mapHistory.push(makeMap('b'), 'edit');
    expect(mapHistory.undo(makeMap('now'))).not.toBeNull();
    expect(mapHistory.undo(makeMap('now'))).not.toBeNull();
    expect(mapHistory.undo(makeMap('now'))).toBeNull();
  });

  it('a new edit clears the redo branch', () => {
    mapHistory.push(makeMap('a'));
    mapHistory.undo(makeMap('b'));
    expect(mapHistory.canRedo).toBe(true);
    mapHistory.push(makeMap('c'));
    expect(mapHistory.canRedo).toBe(false);
  });

  it('clear resets everything', () => {
    mapHistory.push(makeMap('a'));
    mapHistory.clear();
    expect(mapHistory.canUndo).toBe(false);
    expect(mapHistory.canRedo).toBe(false);
  });
});
