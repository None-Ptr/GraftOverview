import { runComparison, LlmError } from './run';
import { countNodes } from './serialize';
import { MAX_SIDE, mergeResults, planChunks, type ChunkPlan } from './chunk';
import { findTreeNode } from './scope';
import { mapSignature, targetSignature } from '$lib/signature';
import { hasApiKey, loadLlmSettings } from '$lib/storage/llm';
import { loadConsent } from '$lib/storage/consent';
import { hostOf } from '$lib/llm/estimate';
import { workspaceStore } from '$lib/state/workspace.svelte';
import { historyState } from '$lib/state/history.svelte';
import { ui } from '$lib/state/ui.svelte';
import { toast } from '$lib/state/toast.svelte';
import { errorMessageKey } from '$lib/llm/errors';
import { t } from '$lib/i18n';
import type { ComparisonResult, NodeId, TargetSystem } from '$lib/types';

/**
 * Owns the comparison lifecycle:
 * - >400 target nodes require picking a top-level branch (§8 v0.2);
 * - large targets are split into one request per top-level branch;
 * - a failure mid-way keeps completed branches and offers "continue".
 */
class CompareController {
  private controller: AbortController | null = null;
  private lastRequest = 0;
  private parts: ComparisonResult[] = [];
  private queue: ChunkPlan[] = [];
  private totalChunks = 1;
  private totalNodes = 0;
  private scope: NodeId | null = null;

  consume(requested: number | null): void {
    if (!requested || requested === this.lastRequest) return;
    this.lastRequest = requested;
    void this.run();
  }

  cancel(): void {
    this.controller?.abort();
  }

  canResume(): boolean {
    return ui.resumeAvailable && this.queue.length > 0;
  }

  /**
   * True when the stored result already matches the current map, target,
   * scope and model — comparing again would spend tokens for the same answer.
   */
  isFresh(): boolean {
    const result = workspaceStore.comparison;
    const target = workspaceStore.target;
    if (!result || !target) return false;

    const map = workspaceStore.map;
    const locale = workspaceStore.workspace.ui.locale;
    const scope = ui.compareScope;
    const scopedRoot = scope ? findTreeNode(target.root, scope) : null;
    if (scope && !scopedRoot) return false;
    const scopedTarget: TargetSystem = scopedRoot ? { ...target, root: scopedRoot } : target;
    const settings = loadLlmSettings();

    return (
      result.mapSignature === mapSignature(map, locale) &&
      result.targetSignature === targetSignature(scopedTarget, locale) &&
      result.model.model === settings.model &&
      result.model.host === hostOf(settings.baseUrl)
    );
  }

  /** Re-run even when the stored result is fresh (explicit user choice). */
  forceRun(): void {
    void this.run(true);
  }

  resume(): void {
    if (!this.canResume()) return;
    void this.execute();
  }

  private async run(force = false): Promise<void> {
    // A session owns the model call while it is running.
    if (workspaceStore.sessionActive) return;
    const target = workspaceStore.target;
    if (!target) {
      ui.targetPickerOpen = true;
      return;
    }
    const map = workspaceStore.map;
    if (countNodes(map.root) > MAX_SIDE) {
      toast.error(t('errors.tooMany'));
      return;
    }
    const targetNodes = countNodes(target.root);
    const scope = ui.compareScope;
    if (!scope && targetNodes > MAX_SIDE) {
      ui.scopePickerOpen = true;
      return;
    }

    const settings = loadLlmSettings();
    if (!hasApiKey(settings)) {
      ui.settingsOpen = true;
      return;
    }
    if (!loadConsent()) {
      ui.consentOpen = true;
      return;
    }
    if (ui.compareProgress?.running) return;

    // Nothing changed since the last run: reuse it instead of paying again.
    if (!force && this.isFresh()) {
      workspaceStore.setPanelTab('suggestions');
      if (typeof window !== 'undefined' && window.matchMedia('(max-width: 960px)').matches) {
        ui.panelOpen = true;
      }
      toast.info(t('compare.unchanged'), {
        label: t('compare.force'),
        run: () => this.forceRun(),
      });
      return;
    }

    const scopedRoot = scope ? findTreeNode(target.root, scope) : null;
    this.scope = scope;
    this.totalNodes = scopedRoot ? countNodes(scopedRoot) : targetNodes;
    this.queue = planChunks(target, scope);
    this.totalChunks = this.queue.length;
    this.parts = [];
    ui.setResumeAvailable(false);
    await this.execute();
  }

  private async execute(): Promise<void> {
    const target = workspaceStore.target;
    if (!target || this.queue.length === 0) return;
    const map = workspaceStore.map;
    const settings = loadLlmSettings();
    const locale = workspaceStore.workspace.ui.locale;

    this.controller = new AbortController();
    ui.startCompare(this.totalNodes, this.totalChunks);
    ui.updateCompareProgress(this.parts.length, this.totalChunks);

    try {
      while (this.queue.length > 0) {
        const chunk = this.queue[0];
        const part = await runComparison(
          map,
          target,
          settings,
          locale,
          workspaceStore.ignoredSignatures,
          this.controller.signal,
          chunk.scope,
        );
        this.parts.push(part);
        this.queue = this.queue.slice(1);
        ui.updateCompareProgress(this.parts.length, this.totalChunks);
      }

      const scopedRoot = this.scope ? findTreeNode(target.root, this.scope) : null;
      const scopedTarget: TargetSystem = scopedRoot ? { ...target, root: scopedRoot } : target;
      const final =
        this.parts.length === 1
          ? this.parts[0]
          : mergeResults(this.parts, this.totalNodes, {
              mapSignature: mapSignature(map, locale),
              targetSignature: targetSignature(scopedTarget, locale),
            });

      workspaceStore.setComparison(final);
      historyState.push({
        id: final.id,
        createdAt: final.createdAt,
        targetTitle: target.title,
        mapTitle: map.title,
        stats: final.stats,
        result: final,
      });
      workspaceStore.setPanelTab('suggestions');
      if (typeof window !== 'undefined' && window.matchMedia('(max-width: 960px)').matches) {
        ui.panelOpen = true;
      }
      toast.info(t('compare.success'));
      this.parts = [];
      this.queue = [];
      ui.setResumeAvailable(false);
    } catch (error: unknown) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        this.parts = [];
        this.queue = [];
        ui.setResumeAvailable(false);
        toast.info(t('compare.canceled'));
        return;
      }
      const key = error instanceof LlmError ? errorMessageKey(error.code) : 'errors.generic';
      if (this.queue.length > 0 && this.parts.length > 0) {
        ui.setResumeAvailable(true);
        toast.error(t(key), { label: t('compare.resume.action'), run: () => this.resume() });
      } else {
        ui.setResumeAvailable(false);
        toast.error(t(key));
      }
    } finally {
      this.controller = null;
      ui.stopCompare();
    }
  }
}

export const compareController = new CompareController();
