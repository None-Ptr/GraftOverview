import type { HistoryEntry } from '$lib/types';
import { clearHistory, loadHistory, pushHistory } from '$lib/storage/history';

/** Reactive view of the ACTIVE workspace's history (`graft.history.v2.<id>`). */
class HistoryState {
  entries = $state<HistoryEntry[]>([]);
  private workspaceId: string | null = null;

  load(workspaceId: string): void {
    this.workspaceId = workspaceId;
    this.entries = loadHistory(workspaceId);
  }

  push(entry: HistoryEntry): void {
    if (!this.workspaceId) return;
    this.entries = pushHistory(this.workspaceId, entry);
  }

  clear(): void {
    if (!this.workspaceId) return;
    clearHistory(this.workspaceId);
    this.entries = [];
  }
}

export const historyState = new HistoryState();
