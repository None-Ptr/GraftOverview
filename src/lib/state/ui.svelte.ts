import type {
  HistoryEntry,
  NodeId,
  PanelTab,
  TargetSystem,
  Workspace,
} from '../types';

export interface CompareProgress {
  running: boolean;
  targetNodes: number;
  startedAt: number; // epoch ms; UI derives mm:ss
  chunksDone?: number;
  chunksTotal?: number;
}

export type MapCommandKind =
  | 'addChild'
  | 'addSibling'
  | 'undo'
  | 'redo'
  | 'fit'
  | 'rename'
  | 'remove';

export interface MapCommand {
  kind: MapCommandKind;
  nodeId?: NodeId;
  ts: number;
}

class UiStore {
  panelTab = $state<PanelTab>('target');
  panelOpen = $state(false); // mobile drawer / bottom sheet

  settingsOpen = $state(false);
  searchOpen = $state(false);
  targetPickerOpen = $state(false);
  targetGenerateOpen = $state(false);
  outlineEditorOpen = $state(false);
  outlineDraft = $state<TargetSystem | null>(null);
  exportOpen = $state(false);
  shareOpen = $state(false);
  consentOpen = $state(false);

  historyDetail = $state<HistoryEntry | null>(null);
  clearHistoryConfirm = $state(false);
  importConfirm = $state<Workspace | null>(null);
  shareImportConfirm = $state(false);

  locateRequest = $state<{ nodeId: NodeId; ts: number } | null>(null);
  /** Bumped when a whole map is swapped in and the canvas should re-fit. */
  fitRequest = $state<number | null>(null);
  /** `target` swaps the canvas into target-editing mode (v0.4). */
  canvasMode = $state<'map' | 'target'>('map');
  targetSelectedId = $state<NodeId | null>(null);
  sessionStartOpen = $state(false);
  sessionReviewOpen = $state(false);
  compareProgress = $state<CompareProgress | null>(null);
  stale = $state(false);
  mapCommand = $state<MapCommand | null>(null);
  /** Set by the consent dialog / shortcut; A4 watches this to actually run a comparison. */
  compareRequested = $state<number | null>(null);
  /** Branch-level comparison scope (a target node id), or null for the whole target. */
  compareScope = $state<NodeId | null>(null);
  scopePickerOpen = $state(false);
  resumeAvailable = $state(false);
  paletteOpen = $state(false);
  workspacesOpen = $state(false);
  /** Set when the user asks for a first draft from a target (§2.4). */
  draftFromTargetIntent = $state(false);

  requestLocate(nodeId: NodeId): void {
    this.locateRequest = { nodeId, ts: Date.now() };
  }

  /** Ask the canvas to fit the current map (after a swap / import / switch). */
  requestFit(): void {
    this.fitRequest = Date.now();
  }

  setCanvasMode(mode: 'map' | 'target'): void {
    this.canvasMode = mode;
    if (mode === 'map') this.targetSelectedId = null;
  }

  /** A0 shell/toolbar sends commands; A1's MapCanvas consumes them. */
  sendMapCommand(kind: MapCommandKind, nodeId?: NodeId): void {
    this.mapCommand = { kind, nodeId, ts: Date.now() };
  }

  startCompare(targetNodes: number, chunksTotal = 1): void {
    this.compareProgress = {
      running: true,
      targetNodes,
      startedAt: Date.now(),
      chunksDone: 0,
      chunksTotal,
    };
  }

  updateCompareProgress(done: number, total: number): void {
    if (!this.compareProgress) return;
    this.compareProgress = { ...this.compareProgress, chunksDone: done, chunksTotal: total };
  }

  stopCompare(): void {
    this.compareProgress = null;
  }

  setResumeAvailable(value: boolean): void {
    this.resumeAvailable = value;
  }

  setCompareScope(scope: NodeId | null): void {
    this.compareScope = scope;
  }

  requestCompare(): void {
    this.compareRequested = Date.now();
  }

  markStale(): void {
    if (this.compareProgress?.running) return;
    this.stale = true;
  }

  clearStale(): void {
    this.stale = false;
  }

  setPanelTab(tab: PanelTab): void {
    this.panelTab = tab;
  }
}

export const ui = new UiStore();
