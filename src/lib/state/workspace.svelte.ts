import { nanoid } from 'nanoid';
import type {
  ComparisonResult,
  GapStatus,
  GapSuggestion,
  KnowledgeMap,
  KnowledgeNode,
  Locale,
  MasteryRecord,
  NodeId,
  PanelTab,
  SessionMode,
  TargetSystem,
  TestSession,
  Workspace,
} from '../types';
import {
  createDefaultWorkspace,
  deleteWorkspaceById,
  loadIndex,
  loadWorkspaceById,
  readRawWorkspace,
  saveIndex,
  saveWorkspaceById,
  type WorkspaceIndex,
  type WorkspaceMeta,
} from '../storage/workspace';
import { clearHistory } from '../storage/history';
import { currentLocale, setLocale, t } from '../i18n';
import { historyState } from './history.svelte';
import { mapHistory } from '$lib/map/history.svelte';
import { mergeTrees } from '$lib/session/merge';
import { toast } from './toast.svelte';
import { ui } from './ui.svelte';

export interface WorkspaceDataError {
  kind: 'corrupt' | 'future-version';
  raw: string;
  version?: number;
}

const SAVE_DEBOUNCE_MS = 500;
const IGNORED_LIMIT = 500;

function metaOf(workspace: Workspace): WorkspaceMeta {
  return {
    id: workspace.map.id,
    title: workspace.map.title,
    updatedAt: workspace.map.updatedAt,
  };
}

class WorkspaceStore {
  index = $state<WorkspaceIndex>({ schemaVersion: 2, activeId: null, items: [] });
  workspace = $state<Workspace>(createDefaultWorkspace());
  dataError = $state<WorkspaceDataError | null>(null);
  savedAt = $state<string | null>(null);
  private timer: ReturnType<typeof setTimeout> | null = null;
  private listenersBound = false;

  load(): void {
    const index = loadIndex();
    this.index = index;

    if (index.items.length === 0) {
      const fresh = createDefaultWorkspace(currentLocale(), t('common.defaultMapTitle'));
      this.workspace = fresh;
      this.dataError = null;
      this.index = { schemaVersion: 2, activeId: fresh.map.id, items: [metaOf(fresh)] };
      saveIndex(this.index);
      saveWorkspaceById(fresh.map.id, fresh);
    } else {
      const meta = index.items.find((item) => item.id === index.activeId) ?? index.items[0];
      const result = loadWorkspaceById(meta.id);
      if (result.status === 'ok') {
        this.workspace = result.workspace;
        this.dataError = null;
      } else if (result.status === 'empty') {
        const fresh = createDefaultWorkspace(currentLocale(), meta.title);
        fresh.map.id = meta.id;
        saveWorkspaceById(meta.id, fresh);
        this.workspace = fresh;
        this.dataError = null;
      } else {
        const placeholder = createDefaultWorkspace(currentLocale(), meta.title);
        placeholder.map.id = meta.id;
        this.workspace = placeholder;
        this.dataError = {
          kind: result.status === 'future-version' ? 'future-version' : 'corrupt',
          raw: result.raw,
          version: result.status === 'future-version' ? result.version : undefined,
        };
      }
      this.index = { ...this.index, activeId: meta.id };
      saveIndex(this.index);
    }

    setLocale(this.workspace.ui.locale);
    ui.setPanelTab(this.workspace.ui.panelTab);
    historyState.load(this.workspace.map.id);
    this.bindFlushListeners();
  }

  private bindFlushListeners(): void {
    if (this.listenersBound || typeof window === 'undefined') return;
    this.listenersBound = true;
    window.addEventListener('beforeunload', () => this.flush());
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') this.flush();
    });
  }

  saveDebounced(): void {
    if (this.timer !== null) clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      this.timer = null;
      this.flush();
    }, SAVE_DEBOUNCE_MS);
  }

  flush(): void {
    if (this.timer !== null) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    if (this.dataError) return; // never clobber damaged / newer data
    try {
      saveWorkspaceById(this.workspace.map.id, this.workspace);
      this.syncIndexMeta();
      this.savedAt = new Date().toISOString();
    } catch {
      toast.error(t('errors.saveFailed'));
    }
  }

  private syncIndexMeta(): void {
    const meta = metaOf(this.workspace);
    const exists = this.index.items.some((item) => item.id === meta.id);
    const items = exists
      ? this.index.items.map((item) => (item.id === meta.id ? meta : item))
      : [meta, ...this.index.items];
    this.index = { ...this.index, items };
    saveIndex(this.index);
  }

  private touch(): void {
    this.saveDebounced();
  }

  switchTo(id: string): void {
    if (id === this.workspace.map.id) return;
    this.flush();
    const result = loadWorkspaceById(id);
    if (result.status !== 'ok') {
      toast.error(t('workspace.loadFailed'));
      return;
    }
    this.workspace = result.workspace;
    this.dataError = null;
    this.index = { ...this.index, activeId: id };
    saveIndex(this.index);
    setLocale(this.workspace.ui.locale);
    ui.setPanelTab(this.workspace.ui.panelTab);
    ui.setCompareScope(null);
    ui.setResumeAvailable(false);
    ui.stale = false;
    ui.panelOpen = false;
    this.savedAt = null;
    historyState.load(id);
    mapHistory.clear();
    ui.requestFit();
  }

  createNew(title?: string): void {
    this.flush();
    const fresh = createDefaultWorkspace(
      currentLocale(),
      (title?.trim() || t('workspace.untitled')).slice(0, 60),
    );
    this.index = {
      schemaVersion: 2,
      activeId: fresh.map.id,
      items: [metaOf(fresh), ...this.index.items],
    };
    saveIndex(this.index);
    saveWorkspaceById(fresh.map.id, fresh);
    this.workspace = fresh;
    this.dataError = null;
    setLocale(fresh.ui.locale);
    ui.setPanelTab(fresh.ui.panelTab);
    ui.setCompareScope(null);
    ui.setResumeAvailable(false);
    ui.stale = false;
    ui.panelOpen = false;
    historyState.load(fresh.map.id);
    mapHistory.clear();
    ui.requestFit();
    toast.info(t('workspace.created'));
  }

  renameWorkspace(id: string, title: string): void {
    const clean = title.trim().slice(0, 60);
    if (!clean) return;
    const now = new Date().toISOString();
    this.index = {
      ...this.index,
      items: this.index.items.map((item) =>
        item.id === id ? { ...item, title: clean, updatedAt: now } : item,
      ),
    };
    saveIndex(this.index);

    if (id === this.workspace.map.id) {
      this.workspace.map.title = clean;
      this.workspace.map.updatedAt = now;
      this.touch();
    } else {
      const result = loadWorkspaceById(id);
      if (result.status === 'ok') {
        result.workspace.map.title = clean;
        result.workspace.map.updatedAt = now;
        saveWorkspaceById(id, result.workspace);
      }
    }
    toast.info(t('workspace.renamed'));
  }

  deleteWorkspace(id: string): void {
    if (this.index.items.length <= 1) {
      toast.error(t('workspace.lastOne'));
      return;
    }
    const remaining = this.index.items.filter((item) => item.id !== id);
    deleteWorkspaceById(id);
    clearHistory(id);

    if (id === this.workspace.map.id) {
      const next = remaining[0].id;
      this.index = { ...this.index, items: remaining, activeId: next };
      saveIndex(this.index);
      const result = loadWorkspaceById(next);
      if (result.status === 'ok') {
        this.workspace = result.workspace;
        this.dataError = null;
        setLocale(this.workspace.ui.locale);
        ui.setPanelTab(this.workspace.ui.panelTab);
        ui.setCompareScope(null);
        ui.setResumeAvailable(false);
        ui.stale = false;
        historyState.load(next);
        mapHistory.clear();
        ui.requestFit();
      }
    } else {
      this.index = { ...this.index, items: remaining };
      saveIndex(this.index);
    }
    toast.info(t('workspace.deleted'));
  }

  replaceMap(map: KnowledgeMap, options: { markStale?: boolean } = {}): void {
    this.workspace.map = map;
    this.workspace.map.updatedAt = new Date().toISOString();
    this.touch();
    if (options.markStale !== false) ui.markStale();
  }

  setMapTitle(title: string): void {
    this.workspace.map.title = title.slice(0, 60);
    this.workspace.map.updatedAt = new Date().toISOString();
    this.touch();
  }

  setTarget(target: TargetSystem | null): void {
    this.workspace.target = target;
    this.touch();
    ui.markStale();
  }

  setTargetTitle(title: string): void {
    if (!this.workspace.target) return;
    this.workspace.target.title = title.slice(0, 60);
    this.workspace.target.updatedAt = new Date().toISOString();
    this.touch();
    ui.markStale();
  }

  /** Replace the target tree (canvas editing). */
  setTargetRoot(root: KnowledgeNode): void {
    if (!this.workspace.target) return;
    this.workspace.target.root = root;
    this.workspace.target.updatedAt = new Date().toISOString();
    this.touch();
    ui.markStale();
  }

  /** Edit one target node's requirement note in place. */
  setTargetNodeNote(id: NodeId, note: string): void {
    const target = this.workspace.target;
    if (!target) return;
    const clean = note.slice(0, 200);
    let changed = false;
    const visit = (node: KnowledgeNode): void => {
      if (node.id === id) {
        if (clean) node.note = clean;
        else delete node.note;
        changed = true;
        return;
      }
      for (const child of node.children) visit(child);
    };
    visit(target.root);
    if (!changed) return;
    target.updatedAt = new Date().toISOString();
    this.touch();
    ui.markStale();
  }

  setComparison(result: ComparisonResult | null): void {
    this.workspace.comparison = result;
    if (result) ui.clearStale();
    this.touch();
  }

  /* ---- Test sessions (v0.4) -------------------------------------------- */

  startSession(mode: SessionMode): void {
    const target = this.workspace.target;
    if (!target || this.workspace.session) return;
    const now = new Date().toISOString();
    const snapshot: TargetSystem = JSON.parse(JSON.stringify(target)) as TargetSystem;
    const attempt: KnowledgeMap = {
      id: nanoid(10),
      title: target.title.slice(0, 60),
      updatedAt: now,
      // Closed-book starts from memory: only the domain name is given away.
      root: { id: nanoid(8), topic: target.root.topic, children: [] },
    };
    this.workspace.session = {
      id: nanoid(10),
      mode,
      status: 'active',
      startedAt: now,
      submittedAt: null,
      targetSnapshot: snapshot,
      attempt,
      resultId: null,
    };
    this.workspace.mastery = this.workspace.mastery ?? {};
    this.touch();
    ui.setCanvasMode('map');
    ui.setPanelTab('target');
    ui.panelOpen = false;
    mapHistory.clear();
  }

  updateAttempt(map: KnowledgeMap): void {
    const session = this.workspace.session;
    if (!session || session.status !== 'active') return;
    session.attempt = map;
    this.touch();
  }

  /** Freeze the attempt before calling the model; failures keep it locked. */
  lockSession(): void {
    const session = this.workspace.session;
    if (!session || session.status !== 'active') return;
    session.status = 'locked';
    session.submittedAt = new Date().toISOString();
    this.touch();
  }

  completeSession(result: ComparisonResult, mastery: Record<NodeId, MasteryRecord>): void {
    const session = this.workspace.session;
    if (!session) return;
    session.status = 'submitted';
    session.resultId = result.id;
    this.workspace.mastery = mastery;
    // The verdict doubles as this round's comparison, so the review dialog and
    // the suggestions pane describe the attempt the user just submitted.
    this.workspace.comparison = result;
    const archive = JSON.parse(JSON.stringify(session)) as TestSession;
    this.workspace.sessions = [archive, ...(this.workspace.sessions ?? [])].slice(0, 10);
    this.touch();
  }

  /** Turn the finished attempt into the workspace map, merge it, or drop it. */
  resolveSession(choice: 'replace' | 'merge' | 'discard'): void {
    const session = this.workspace.session;
    if (!session) return;
    if (choice === 'replace') {
      this.workspace.map = { ...session.attempt, id: this.workspace.map.id, updatedAt: new Date().toISOString() };
    } else if (choice === 'merge') {
      this.workspace.map.root = mergeTrees(
        this.workspace.map.root,
        session.attempt.root,
        this.workspace.ui.locale,
      );
      this.workspace.map.updatedAt = new Date().toISOString();
      ui.markStale();
    } else {
      this.workspace.comparison = null;
    }
    this.workspace.session = null;
    this.touch();
    ui.setCanvasMode('map');
    ui.requestFit();
    mapHistory.clear();
    toast.info(t(choice === 'discard' ? 'session.discarded' : 'session.resolved'));
  }

  abandonSession(): void {
    if (!this.workspace.session) return;
    this.workspace.session = null;
    this.touch();
    ui.requestFit();
    mapHistory.clear();
  }

  get activeMap(): KnowledgeMap {
    return this.workspace.session?.attempt ?? this.workspace.map;
  }

  get session(): TestSession | null {
    return this.workspace.session ?? null;
  }

  get sessionActive(): boolean {
    return Boolean(this.workspace.session);
  }

  get mastery(): Record<NodeId, MasteryRecord> | undefined {
    return this.workspace.mastery;
  }

  updateGapStatus(signature: string, status: GapStatus): void {
    const result = this.workspace.comparison;
    if (!result) return;
    const gap = result.gaps.find((g) => g.signature === signature);
    if (!gap) return;
    gap.status = status;
    this.touch();
  }

  setIgnored(signatures: string[]): void {
    this.workspace.ignoredSignatures = signatures.slice(0, IGNORED_LIMIT);
    this.touch();
  }

  addIgnored(signature: string): void {
    if (this.workspace.ignoredSignatures.includes(signature)) return;
    this.workspace.ignoredSignatures = [
      ...this.workspace.ignoredSignatures,
      signature,
    ].slice(-IGNORED_LIMIT);
    this.touch();
  }

  removeIgnored(signature: string): void {
    this.workspace.ignoredSignatures = this.workspace.ignoredSignatures.filter(
      (s) => s !== signature,
    );
    this.touch();
  }

  setLocale(locale: Locale): void {
    this.workspace.ui.locale = locale;
    setLocale(locale);
    this.touch();
  }

  setPanelTab(tab: PanelTab): void {
    this.workspace.ui.panelTab = tab;
    ui.setPanelTab(tab);
    this.touch();
  }

  /** Import a project file as a NEW workspace (never overwrites the current one). */
  importWorkspace(workspace: Workspace): void {
    this.flush();
    const collision =
      this.index.items.some((item) => item.id === workspace.map.id) || !workspace.map.id;
    const id = collision ? nanoid(10) : workspace.map.id;
    const doc: Workspace = {
      ...workspace,
      map: { ...workspace.map, id, updatedAt: new Date().toISOString() },
    };
    this.index = { schemaVersion: 2, activeId: id, items: [metaOf(doc), ...this.index.items] };
    saveIndex(this.index);
    saveWorkspaceById(id, doc);
    this.workspace = doc;
    this.dataError = null;
    setLocale(doc.ui.locale);
    ui.setPanelTab(doc.ui.panelTab);
    ui.setCompareScope(null);
    ui.setResumeAvailable(false);
    ui.stale = false;
    ui.panelOpen = false;
    historyState.load(id);
    mapHistory.clear();
    ui.requestFit();
    toast.info(t('workspace.imported'));
  }

  resetWorkspace(): void {
    const oldId = this.workspace.map.id;
    deleteWorkspaceById(oldId);
    clearHistory(oldId);
    const fresh = createDefaultWorkspace(currentLocale(), t('common.defaultMapTitle'));
    const remaining = this.index.items.filter((item) => item.id !== oldId);
    this.index = { schemaVersion: 2, activeId: fresh.map.id, items: [metaOf(fresh), ...remaining] };
    saveIndex(this.index);
    saveWorkspaceById(fresh.map.id, fresh);
    this.workspace = fresh;
    this.dataError = null;
    ui.setCompareScope(null);
    ui.setResumeAvailable(false);
    ui.stale = false;
    historyState.load(fresh.map.id);
    mapHistory.clear();
    this.flush();
    ui.requestFit();
  }

  exportRawData(): string {
    return this.dataError?.raw ?? readRawWorkspace(this.workspace.map.id) ?? '';
  }

  get workspaces(): WorkspaceMeta[] {
    return this.index.items;
  }

  get activeId(): string {
    return this.workspace.map.id;
  }

  get map(): KnowledgeMap {
    return this.workspace.map;
  }

  get target(): TargetSystem | null {
    return this.workspace.target;
  }

  get comparison(): ComparisonResult | null {
    return this.workspace.comparison;
  }

  get ignoredSignatures(): string[] {
    return this.workspace.ignoredSignatures;
  }

  get hasTarget(): boolean {
    return this.workspace.target !== null;
  }

  get coverage(): number {
    return this.workspace.comparison?.stats.coverage ?? 0;
  }

  get activeGaps(): GapSuggestion[] {
    return (this.workspace.comparison?.gaps ?? []).filter((g) => g.status === 'pending');
  }
}

export const workspaceStore = new WorkspaceStore();
