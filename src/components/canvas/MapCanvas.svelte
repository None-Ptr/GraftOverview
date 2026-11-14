<script lang="ts">
  import { onMount } from 'svelte';
  import MindElixir from 'mind-elixir';
  import type { MindElixirData, NodeObj } from 'mind-elixir';
  import { nanoid } from 'nanoid';
  import 'mind-elixir/style.css';
  import type { GhostTree, KnowledgeMap, KnowledgeNode, NodeId } from '$lib/types';
  import { fromMindElixirData, toMindElixirData } from '$lib/map/adapter';
  import { cloneMap } from '$lib/map/commands';
  import { mapHistory } from '$lib/map/history.svelte';
  import { editor } from '$lib/map/editor.svelte';
  import { ui, type MapCommandKind } from '$lib/state/ui.svelte';
  import { isGhostId } from '$lib/locate';
  import { t } from '$lib/i18n';

  interface Props {
    map: KnowledgeMap;
    ghostTrees: GhostTree[];
    selectedNodeId: NodeId | null;
    locateRequest: { nodeId: NodeId; ts: number } | null;
    onMapChange: (map: KnowledgeMap, meta: { source: 'editor' | 'undo' }) => void;
    onSelect: (nodeId: NodeId | null) => void;
    onGhostAdopt: (signature: string) => void;
    onZoomChange?: (percent: number) => void;
  }

  let {
    map,
    ghostTrees,
    locateRequest,
    onMapChange,
    onSelect,
    onGhostAdopt,
    onZoomChange,
  }: Props = $props();

  let host: HTMLDivElement;
  let instance: MindElixir | null = null;
  let ready = $state(false);
  let applyingExternal = false;
  let suppressExternal = false;
  const EMPTY_MAP: KnowledgeMap = {
    id: '',
    title: '',
    updatedAt: '',
    root: { id: '', topic: '', children: [] },
  };
  let baseline = $state<KnowledgeMap>(EMPTY_MAP);
  let lastMapSig = '';
  let lastGhostSig = '';
  let lastLocateTs = 0;
  let lastFitTs = 0;
  /** Scale of the last automatic fit; null once the user zooms manually. */
  let autoFitScale: number | null = 1;
  let fitting = false;
  let lastSize = { w: 0, h: 0 };

  /** Fit + centre, remembering that the resulting zoom is the automatic one. */
  function fitView(center = false): void {
    if (!instance) return;
    fitting = true;
    instance.scaleFit();
    if (center) instance.toCenter();
    autoFitScale = instance.scaleVal;
    fitting = false;
  }

  function data(m: KnowledgeMap, g: GhostTree[]): MindElixirData {
    return toMindElixirData(m, g);
  }

  function ghostSig(g: GhostTree[]): string {
    return g.map((tree) => `${tree.signature}:${tree.parentId ?? ''}`).join('|');
  }

  function containsId(node: KnowledgeNode, id: NodeId): boolean {
    if (node.id === id) return true;
    return node.children.some((child) => containsId(child, id));
  }

  /** Install a canonical map into mind-elixir and notify the store. */
  function apply(next: KnowledgeMap, source: 'editor' | 'undo'): void {
    if (!instance) return;
    applyingExternal = true;
    instance.refresh(data(next, ghostTrees));
    applyingExternal = false;
    baseline = cloneMap(next);
    suppressExternal = true;
    onMapChange(next, { source });
  }

  /** mind-elixir mutated itself (edit / drag / built-in operation). */
  function handleOperation(): void {
    if (!instance || applyingExternal) return;
    const next = fromMindElixirData(instance.getData(), map);
    mapHistory.push(baseline, 'edit');
    baseline = cloneMap(next);
    suppressExternal = true;
    onMapChange(next, { source: 'editor' });
  }

  function currentId(): NodeId {
    return editor.selectedNodeId ?? instance?.currentNode?.nodeObj?.id ?? map.root.id;
  }

  function execute(kind: MapCommandKind, nodeId?: NodeId): void {
    if (!instance || !ready) return;
    const id = nodeId ?? currentId();
    switch (kind) {
      case 'addChild': {
        const node = { id: nanoid(8), topic: t('map.node.new'), children: [] } as NodeObj;
        const parent = id ? instance.findEle(id) : undefined;
        void instance.addChild(parent, node);
        break;
      }
      case 'addSibling': {
        if (id === map.root.id) {
          void instance.addChild(instance.findEle(map.root.id), {
            id: nanoid(8),
            topic: t('map.node.new'),
            children: [],
          } as NodeObj);
        } else {
          void instance.insertSibling('after', instance.findEle(id), {
            id: nanoid(8),
            topic: t('map.node.new'),
            children: [],
          } as NodeObj);
        }
        break;
      }
      case 'rename': {
        void instance.beginEdit(instance.findEle(id));
        break;
      }
      case 'remove': {
        if (id === map.root.id) return;
        void instance.removeNodes([instance.findEle(id)]);
        break;
      }
      case 'undo': {
        const previous = mapHistory.undo(baseline);
        if (previous) apply(previous, 'undo');
        break;
      }
      case 'redo': {
        const next = mapHistory.redo(baseline);
        if (next) apply(next, 'undo');
        break;
      }
      case 'fit': {
        fitView(true);
        break;
      }
    }
  }

  function handleKeydown(event: KeyboardEvent): void {
    if (event.defaultPrevented || document.querySelector('dialog[open]')) return;
    const target = event.target as HTMLElement | null;
    if (target?.closest('input, textarea, select, [contenteditable="true"]')) return;
    const mod = event.ctrlKey || event.metaKey;
    if (mod && event.key.toLowerCase() === 'z') {
      event.preventDefault();
      execute(event.shiftKey ? 'redo' : 'undo');
      return;
    }
    if (mod || event.altKey) return;
    if (event.key === 'Tab') {
      event.preventDefault();
      execute('addChild');
    } else if (event.key === 'Enter') {
      event.preventDefault();
      execute('addSibling');
    } else if (event.key === 'F2') {
      event.preventDefault();
      execute('rename');
    } else if (event.key === 'Delete' || event.key === 'Backspace') {
      event.preventDefault();
      execute('remove');
    }
  }

  function handleGhostClick(event: MouseEvent): void {
    const el = (event.target as HTMLElement | null)?.closest('[data-nodeid]') as HTMLElement | null;
    const raw = el?.dataset.nodeid;
    if (!raw || !raw.startsWith('me')) return;
    const id = raw.slice(2);
    if (!isGhostId(id)) return;
    const tree = ghostTrees.find((candidate) => containsId(candidate.root, id));
    if (tree) onGhostAdopt(tree.signature);
  }

  onMount(() => {
    let cancelled = false;
    const me = new MindElixir({
      el: host,
      direction: MindElixir.RIGHT,
      editable: true,
      contextMenu: false,
      toolBar: false,
      keypress: false,
      allowUndo: false,
      overflowHidden: false,
      // Left-drag pans the canvas (the usual canvas gesture); box-select moves to right-drag.
      mouseSelectionButton: 2,
      newTopicName: t('map.node.new'),
    });
    instance = me;
    baseline = cloneMap(map);
    lastMapSig = JSON.stringify(toMindElixirData(map, ghostTrees).nodeData);
    lastGhostSig = ghostSig(ghostTrees);

    void me.init(data(map, ghostTrees)).then(() => {
      if (cancelled) return;
      ready = true;
      me.bus.addListener('operation', handleOperation);
      me.bus.addListener('scale', (value: number) => {
        const percent = Math.round(value * 100);
        editor.zoom = percent;
        onZoomChange?.(percent);
        if (!fitting && autoFitScale !== null && Math.abs(value - autoFitScale) > 0.005) {
          // The user zoomed manually; stop auto-fitting on resize.
          autoFitScale = null;
        }
      });
      me.bus.addListener('selectNewNode', (node: NodeObj) => {
        if (!isGhostId(node.id)) {
          editor.selectedNodeId = node.id;
          onSelect(node.id);
        }
      });
      me.bus.addListener('selectNodes', (nodes: NodeObj[]) => {
        const first = nodes[0];
        const id = first && !isGhostId(first.id) ? first.id : null;
        editor.selectedNodeId = id;
        onSelect(id);
      });
      me.bus.addListener('unselectNodes', () => {
        editor.selectedNodeId = null;
        onSelect(null);
      });
      // Fit once the browser has laid the nodes out; measuring inside the
      // init tick can see a zero-sized scene and leave the map at 100%.
      requestAnimationFrame(() => {
        if (cancelled) return;
        fitView();
        lastSize = { w: host.clientWidth, h: host.clientHeight };
      });
    });

    // Keep an auto-fitted map fitted when the canvas is resized (panel toggle,
    // window resize, orientation change). Manual zoom is left alone.
    const observer = new ResizeObserver((entries) => {
      const rect = entries[0]?.contentRect;
      if (!rect || !ready) return;
      const changed =
        Math.abs(rect.width - lastSize.w) > 2 || Math.abs(rect.height - lastSize.h) > 2;
      lastSize = { w: rect.width, h: rect.height };
      if (changed && autoFitScale !== null) fitView();
    });
    observer.observe(host);

    editor.register(execute);
    return () => {
      cancelled = true;
      ready = false;
      observer.disconnect();
      editor.register(null);
      me.destroy();
      instance = null;
    };
  });

  // Consume commands sent by A0's toolbar / empty-state actions.
  $effect(() => {
    editor.consume(ui.mapCommand);
  });

  // Reconcile external changes (adoption, JSON import, undo) or ghost-layer changes.
  $effect(() => {
    const currentMap = map;
    const currentGhosts = ghostTrees;
    if (!instance || !ready) return;

    if (suppressExternal) {
      suppressExternal = false;
      baseline = cloneMap(currentMap);
      lastMapSig = JSON.stringify(data(currentMap, currentGhosts).nodeData);
      lastGhostSig = ghostSig(currentGhosts);
      return;
    }

    const incomingSig = JSON.stringify(data(currentMap, currentGhosts).nodeData);
    const incomingGhostSig = ghostSig(currentGhosts);
    if (incomingSig === lastMapSig && incomingGhostSig === lastGhostSig) return;

    // If only the ghost layer changed, keep the instance's current node data.
    const liveSig = JSON.stringify(instance.getData().nodeData);
    const canonicalSig = JSON.stringify(data(currentMap, []).nodeData);
    if (liveSig === canonicalSig) {
      applyingExternal = true;
      instance.refresh(data(currentMap, currentGhosts));
      applyingExternal = false;
    } else {
      applyingExternal = true;
      instance.refresh(data(currentMap, currentGhosts));
      applyingExternal = false;
      baseline = cloneMap(currentMap);
      mapHistory.clear();
    }
    lastMapSig = incomingSig;
    lastGhostSig = incomingGhostSig;
  });

  // Locate requests (search results, target-tree clicks).
  $effect(() => {
    const request = locateRequest;
    if (!request || !instance || !ready || request.ts === lastLocateTs) return;
    lastLocateTs = request.ts;
    try {
      const el = instance.findEle(request.nodeId);
      instance.selectNode(el);
      instance.scrollIntoView(el, true);
    } catch {
      // Node may have been removed; ignore.
    }
  });

  // Re-fit after a whole map is swapped in (draft, import, workspace switch).
  $effect(() => {
    const request = ui.fitRequest;
    if (!request || !instance || !ready || request === lastFitTs) return;
    lastFitTs = request;
    requestAnimationFrame(() => {
      if (!instance) return;
      fitView();
    });
  });
</script>

<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<div
  class="host"
  bind:this={host}
  tabindex="-1"
  role="application"
  aria-label={t('map.empty.title')}
  onkeydown={handleKeydown}
  onclick={handleGhostClick}
></div>

<style>
  .host {
    width: 100%;
    height: 100%;
    min-height: 0;
    outline: none;
  }
  .host:focus-visible {
    outline: 2px solid var(--color-focus);
    outline-offset: -2px;
  }

  /* Map the mind-elixir surface onto the A0 design tokens (§5.2). */
  .host :global(.map-container) {
    --main-color: var(--color-ink-2);
    --main-bgcolor: var(--color-paper);
    --main-bgcolor-transparent: color-mix(in oklch, var(--color-paper) 75%, transparent);
    --color: var(--color-ink-2);
    --bgcolor: var(--color-paper);
    --selected: var(--color-accent);
    --accent-color: var(--color-accent);
    --root-color: var(--color-on-graphite);
    --root-bgcolor: var(--color-graphite);
    --root-border-color: var(--color-graphite);
    --root-radius: var(--radius-control);
    --main-radius: var(--radius-control);
    --topic-padding: 6px 10px;
    --panel-color: var(--color-ink-2);
    --panel-bgcolor: var(--color-paper-2);
    --panel-border-color: var(--color-rule);
    --map-padding: 40px;
    background: transparent;
    font-family: var(--font-body);
  }
  .host :global(.map-container .me-tpc) {
    font-size: var(--text-sm);
    border-radius: var(--radius-control);
  }
  .host :global(.map-container .me-root .me-tpc) {
    font-family: var(--font-display);
    font-size: var(--text-md);
    font-weight: 600;
    letter-spacing: -0.02em;
  }

  /* Ghost nodes: dashed amber, never solid (§5.5). */
  .host :global(.map-container .me-tpc[data-nodeid^='meghost-']) {
    border: 1.5px dashed var(--color-gap) !important;
    background: var(--color-gap-surface) !important;
    color: var(--color-gap-ink) !important;
    font-family: var(--font-body);
    font-size: var(--text-sm);
  }
  .host :global(.map-container .me-tpc[data-nodeid^='meghost-']:hover) {
    background: color-mix(in oklch, var(--color-gap-surface) 70%, var(--color-gap)) !important;
  }

  @media (max-width: 640px) {
    .host {
      height: 100%;
      min-height: 0;
    }
  }
</style>
