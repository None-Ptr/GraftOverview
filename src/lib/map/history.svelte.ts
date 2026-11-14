import type { KnowledgeMap } from '$lib/types';
import { cloneMap } from './commands';

export const MAX_UNDO_STEPS = 50;
const MERGE_WINDOW_MS = 500;

/**
 * Snapshot-based undo/redo for the canonical map. Ghost nodes never live here —
 * they are always re-derived from the comparison result.
 * `push` records the state BEFORE a mutation; `undo`/`redo` receive the
 * current state so the journal stays balanced without a separate store.
 */
export class MapHistory {
  private past: KnowledgeMap[] = [];
  private future: KnowledgeMap[] = [];
  private lastPushAt = 0;
  private lastKey = '';

  canUndo = $state(false);
  canRedo = $state(false);

  /** Push the state BEFORE a mutation. `key` merges rapid edits into one step. */
  push(snapshot: KnowledgeMap, key = ''): void {
    const now = Date.now();
    if (key && key === this.lastKey && now - this.lastPushAt < MERGE_WINDOW_MS) {
      this.lastPushAt = now;
      return;
    }
    this.past.push(cloneMap(snapshot));
    if (this.past.length > MAX_UNDO_STEPS) this.past.shift();
    this.future = [];
    this.lastPushAt = now;
    this.lastKey = key;
    this.sync();
  }

  undo(current: KnowledgeMap): KnowledgeMap | null {
    const snapshot = this.past.pop();
    if (!snapshot) return null;
    this.future.push(cloneMap(current));
    if (this.future.length > MAX_UNDO_STEPS) this.future.shift();
    this.lastKey = '';
    this.sync();
    return cloneMap(snapshot);
  }

  redo(current: KnowledgeMap): KnowledgeMap | null {
    const snapshot = this.future.pop();
    if (!snapshot) return null;
    this.past.push(cloneMap(current));
    if (this.past.length > MAX_UNDO_STEPS) this.past.shift();
    this.lastKey = '';
    this.sync();
    return cloneMap(snapshot);
  }

  clear(): void {
    this.past = [];
    this.future = [];
    this.lastKey = '';
    this.lastPushAt = 0;
    this.sync();
  }

  private sync(): void {
    this.canUndo = this.past.length > 0;
    this.canRedo = this.future.length > 0;
  }
}

export const mapHistory = new MapHistory();
/** Separate journal for target-canvas editing; never mixes with the map's. */
export const targetHistory = new MapHistory();
