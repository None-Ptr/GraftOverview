<script lang="ts">
  import type { GhostTree, KnowledgeMap, KnowledgeNode, NodeId } from '$lib/types';
  import MapCanvas from '../canvas/MapCanvas.svelte';
  import CanvasToolbar from '../canvas/CanvasToolbar.svelte';
  import ProgressOverlay from '../suggestions/ProgressOverlay.svelte';
  import EmptyState from '../common/EmptyState.svelte';
  import Button from '../common/Button.svelte';
  import TargetCanvas from '../target/TargetCanvas.svelte';
  import SessionBar from '../session/SessionBar.svelte';
  import { ui } from '$lib/state/ui.svelte';
  import { workspaceStore } from '$lib/state/workspace.svelte';
  import { targetHistory } from '$lib/map/history.svelte';
  import { targetEditor } from '$lib/target/editor.svelte';
  import { t } from '$lib/i18n';

  interface Props {
    map: KnowledgeMap;
    ghostTrees: GhostTree[];
    selectedNodeId: NodeId | null;
    locateRequest: { nodeId: NodeId; ts: number } | null;
    onMapChange: (map: KnowledgeMap, meta: { source: 'editor' | 'undo' }) => void;
    onSelect: (nodeId: NodeId | null) => void;
    onGhostAdopt: (signature: string) => void;
    onAction: (action: 'generate' | 'blank' | 'import') => void;
  }

  let {
    map,
    ghostTrees,
    selectedNodeId,
    locateRequest,
    onMapChange,
    onSelect,
    onGhostAdopt,
    onAction,
  }: Props = $props();

  let zoom = $state(100);
  let targetZoom = $state(100);
  let isEmpty = $derived(map.root.children.length === 0);
  let nodeCount = $derived(countNodes(map.root));
  let targetMode = $derived(ui.canvasMode === 'target' && workspaceStore.target !== null);
  let targetNodeCount = $derived(
    workspaceStore.target ? countNodes(workspaceStore.target.root) : 0,
  );

  function countNodes(node: KnowledgeNode): number {
    return 1 + node.children.reduce((sum, child) => sum + countNodes(child), 0);
  }
</script>

<section class="canvas">
  <div class="canvas-inner">
    {#if targetMode && workspaceStore.target}
      <TargetCanvas
        target={workspaceStore.target}
        onZoomChange={(percent) => (targetZoom = percent)}
      />
    {:else}
      <MapCanvas
        {map}
        {ghostTrees}
        {selectedNodeId}
        {locateRequest}
        {onMapChange}
        {onSelect}
        {onGhostAdopt}
        onZoomChange={(percent) => (zoom = percent)}
      />
    {/if}
  </div>

  {#if targetMode}
    <div class="mode" role="status">
      <span class="mode-label">{t('target.canvas.banner')}</span>
      <Button variant="small" onclick={() => ui.setCanvasMode('map')}>
        {t('target.canvas.done')}
      </Button>
    </div>
  {:else if isEmpty}
    <div class="empty">
      <EmptyState
        title={t('map.empty.title')}
        body={t('map.empty.body')}
        hint={t('map.empty.hint')}
      >
        {#snippet actions()}
          <Button variant="primary" onclick={() => onAction('generate')}>
            {t('map.empty.generate')}
          </Button>
          <Button variant="ghost" onclick={() => onAction('blank')}>
            {t('map.empty.blank')}
          </Button>
          <button class="link" type="button" onclick={() => onAction('import')}>
            {t('map.empty.import')}
          </button>
        {/snippet}
      </EmptyState>
    </div>
  {/if}

  {#if targetMode}
    <div class="toolbar">
      <CanvasToolbar
        canUndo={targetHistory.canUndo}
        canRedo={targetHistory.canRedo}
        onCommand={(kind) => targetEditor.run(kind)}
      />
    </div>
    <div class="status tabular">
      {t('target.canvas.status', {
        count: targetNodeCount,
        percent: targetZoom,
      })}
    </div>
  {:else}
    <div class="toolbar"><CanvasToolbar /></div>
    <div class="status tabular">
      {t('common.nodeCount', { count: nodeCount })} · {t('common.ghostCount', {
        count: ghostTrees.length,
      })} · {t('map.status.zoom', { percent: zoom })}
    </div>
  {/if}

  <div class="progress"><ProgressOverlay /></div>
  <SessionBar />
</section>

<style>
  .canvas {
    position: relative;
    flex: 1;
    min-width: 0;
    overflow: hidden;
    padding: 0;
    background-color: var(--color-paper);
    background-image: radial-gradient(circle at 1px 1px, var(--color-grid) 1px, transparent 0);
    background-size: 24px 24px;
    background-attachment: local;
  }
  .canvas-inner {
    width: 100%;
    height: 100%;
  }
  .empty {
    position: absolute;
    top: 48px;
    left: 48px;
    z-index: var(--z-raised);
    pointer-events: none;
  }
  .mode {
    position: absolute;
    top: 12px;
    left: 50%;
    z-index: var(--z-raised);
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    padding: 4px 4px 4px var(--spacing-sm);
    border: 1px solid var(--color-accent);
    border-radius: var(--radius-control);
    background: var(--color-accent-surface);
    box-shadow: var(--shadow-whisper);
    transform: translateX(-50%);
  }
  .mode-label {
    font-size: var(--text-xs);
    color: var(--color-ink-2);
    white-space: nowrap;
  }
  .empty :global(*) {
    pointer-events: auto;
  }
  .empty .link {
    padding: 0;
    border: 0;
    background: none;
    color: var(--color-accent);
    font-size: var(--text-sm);
    text-decoration: underline;
    text-underline-offset: 3px;
  }
  .empty .link:hover {
    color: var(--color-accent-hover);
  }
  .empty .link:focus-visible {
    outline: 2px solid var(--color-focus);
    outline-offset: 2px;
  }
  .toolbar {
    position: absolute;
    left: 16px;
    bottom: 16px;
    z-index: var(--z-raised);
  }
  .status {
    position: absolute;
    right: 16px;
    bottom: 16px;
    z-index: var(--z-raised);
    font-family: var(--font-mono);
    font-size: var(--text-2xs);
    letter-spacing: 0.06em;
    color: var(--color-muted);
  }
  .progress {
    position: absolute;
    top: 16px;
    left: 50%;
    z-index: var(--z-raised);
    transform: translateX(-50%);
  }

  @media (max-width: 640px) {
    .empty {
      top: var(--spacing-lg);
      left: var(--spacing-md);
      right: var(--spacing-md);
    }
    .status {
      display: none;
    }
    .toolbar {
      left: 50%;
      bottom: var(--spacing-md);
      transform: translateX(-50%);
    }
  }
</style>
