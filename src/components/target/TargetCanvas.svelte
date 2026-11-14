<script lang="ts">
  import { onMount } from 'svelte';
  import MindElixir from 'mind-elixir';
  import type { MindElixirData, NodeObj } from 'mind-elixir';
  import { nanoid } from 'nanoid';
  import 'mind-elixir/style.css';
  import type { KnowledgeMap, KnowledgeNode, NodeId, TargetSystem } from '$lib/types';
  import { fromMindElixirData, toMindElixirData } from '$lib/map/adapter';
  import { cloneMap } from '$lib/map/commands';
  import { targetHistory } from '$lib/map/history.svelte';
  import { targetEditor } from '$lib/target/editor.svelte';
  import { ui, type MapCommandKind } from '$lib/state/ui.svelte';
  import { workspaceStore } from '$lib/state/workspace.svelte';
  import { t } from '$lib/i18n';

  interface Props {
    target: TargetSystem;
    onZoomChange?: (percent: number) => void;
  }

  let { target, onZoomChange }: Props = $props();

  let host: HTMLDivElement;
  let instance: MindElixir | null = null;
  let ready = $state(false);
  let applying = false;
  let suppress = false;
  let lastSig = '';
  let lastSelected: NodeId | null = null;
  /** Canonical snapshot used for undo (targets never share the map journal). */
  let baseline: KnowledgeMap = {
    id: '',
    title: '',
    updatedAt: '',
    root: { id: '', topic: '', children: [] },
  };

  function wrap(t: TargetSystem, root: KnowledgeNode = t.root): KnowledgeMap {
    return { id: t.id, title: t.title, updatedAt: t.updatedAt, root };
  }

  function data(t: TargetSystem): MindElixirData {
    return toMindElixirData(wrap(t), []);
  }

  function sig(t: TargetSystem): string {
    return JSON.stringify(data(t).nodeData);
  }

  /**
   * Mirror the mastery verdict onto the rendered nodes so the target canvas
   * shows the same state as the target tree.
   */
  function applyMasteryMarks(): void {
    if (!host) return;
    const records = workspaceStore.mastery ?? {};
    const nodes = host.querySelectorAll<HTMLElement>('.me-tpc[data-nodeid]');
    for (const el of nodes) {
      const raw = el.dataset.nodeid ?? '';
      if (!raw.startsWith('me')) continue;
      const record = records[raw.slice(2)];
      el.dataset.mastery = record?.state ?? 'unset';
      if (record?.confidence != null) {
        el.dataset.confidence = String(Math.round(record.confidence * 100));
        el.title = `${t('session.state.mastered')} · ${Math.round(record.confidence * 100)}%`;
      } else {
        delete el.dataset.confidence;
        el.title = '';
      }
    }
  }

  /** Install a target tree into mind-elixir and persist it. */
  function apply(root: KnowledgeNode): void {
    if (!instance) return;
    applying = true;
    instance.refresh(toMindElixirData(wrap(target, root), []));
    applying = false;
    applyMasteryMarks();
    baseline = cloneMap(wrap(target, root));
    suppress = true;
    workspaceStore.setTargetRoot(root);
  }

  function handleOperation(): void {
    if (!instance || applying) return;
    const next = fromMindElixirData(instance.getData()).root;
    targetHistory.push(baseline, 'target-edit');
    baseline = cloneMap(wrap(target, next));
    suppress = true;
    applyMasteryMarks();
    workspaceStore.setTargetRoot(next);
  }

  function currentId(): NodeId {
    return ui.targetSelectedId ?? instance?.currentNode?.nodeObj?.id ?? target.root.id;
  }

  function execute(kind: MapCommandKind): void {
    if (!instance || !ready) return;
    const id = currentId();
    switch (kind) {
      case 'addChild': {
        const parent = id ? instance.findEle(id) : undefined;
        void instance.addChild(parent, {
          id: nanoid(8),
          topic: t('map.node.new'),
          children: [],
        } as NodeObj);
        break;
      }
      case 'addSibling': {
        if (id === target.root.id) {
          void instance.addChild(instance.findEle(target.root.id), {
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
      case 'rename':
        void instance.beginEdit(instance.findEle(id));
        break;
      case 'remove':
        if (id === target.root.id) return;
        void instance.removeNodes([instance.findEle(id)]);
        break;
      case 'undo': {
        const previous = targetHistory.undo(baseline);
        if (previous) apply(previous.root);
        break;
      }
      case 'redo': {
        const next = targetHistory.redo(baseline);
        if (next) apply(next.root);
        break;
      }
      case 'fit':
        instance.scaleFit();
        instance.toCenter();
        break;
    }
  }

  function handleKeydown(event: KeyboardEvent): void {
    if (event.defaultPrevented || document.querySelector('dialog[open]')) return;
    const el = event.target as HTMLElement | null;
    if (el?.closest('input, textarea, select, [contenteditable="true"]')) return;
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
      mouseSelectionButton: 2,
      newTopicName: t('map.node.new'),
    });
    instance = me;
    lastSig = sig(target);
    baseline = cloneMap(wrap(target));

    void me.init(data(target)).then(() => {
      if (cancelled) return;
      ready = true;
      me.bus.addListener('operation', handleOperation);
      me.bus.addListener('scale', (value: number) => onZoomChange?.(Math.round(value * 100)));
      me.bus.addListener('selectNewNode', (node: NodeObj) => {
        lastSelected = node.id;
        ui.targetSelectedId = node.id;
      });
      me.bus.addListener('selectNodes', (nodes: NodeObj[]) => {
        const id = nodes[0]?.id ?? null;
        lastSelected = id;
        ui.targetSelectedId = id;
      });
      me.bus.addListener('unselectNodes', () => {
        lastSelected = null;
        ui.targetSelectedId = null;
      });
      requestAnimationFrame(() => {
        if (cancelled) return;
        me.scaleFit();
      });
      applyMasteryMarks();
    });

    const observer = new ResizeObserver(() => {
      if (!ready) return;
      instance?.scaleFit();
    });
    observer.observe(host);

    targetEditor.register(execute);
    targetHistory.clear();
    return () => {
      cancelled = true;
      ready = false;
      observer.disconnect();
      targetEditor.register(null);
      me.destroy();
      instance = null;
    };
  });

  // External edits (outline dialog, template swap) must reach the canvas.
  $effect(() => {
    const current = target;
    if (!instance || !ready) return;
    if (suppress) {
      suppress = false;
      lastSig = sig(current);
      baseline = cloneMap(wrap(current));
      return;
    }
    const incoming = sig(current);
    if (incoming === lastSig) return;
    applying = true;
    instance.refresh(data(current));
    applying = false;
    applyMasteryMarks();
    lastSig = incoming;
    baseline = cloneMap(wrap(current));
    targetHistory.clear();
  });

  // A finished session writes the verdicts; reflect them on the canvas.
  $effect(() => {
    const records = workspaceStore.mastery;
    void records;
    if (!ready) return;
    applyMasteryMarks();
  });

  // Right-pane clicks select the matching canvas node.
  $effect(() => {
    const id = ui.targetSelectedId;
    if (!id || !instance || !ready || id === lastSelected) return;
    lastSelected = id;
    try {
      const el = instance.findEle(id);
      instance.selectNode(el);
      instance.scrollIntoView(el, true);
    } catch {
      // Node may have been removed.
    }
  });
</script>

<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<div
  class="host"
  bind:this={host}
  tabindex="-1"
  role="application"
  aria-label={t('target.canvas.banner')}
  onkeydown={handleKeydown}
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
  /* Target editing is a different act from drawing: the root stays neutral. */
  .host :global(.map-container .me-root .me-tpc) {
    border: 1.5px dashed var(--color-rule-2);
  }
  /* Mastery verdict per node, written by test sessions. */
  .host :global(.map-container .me-tpc[data-mastery='mastered']) {
    border-color: var(--color-accent) !important;
    background: var(--color-accent-surface) !important;
  }
  .host :global(.map-container .me-tpc[data-mastery='learning']) {
    border-color: var(--color-gap) !important;
    background: var(--color-gap-surface) !important;
  }
  .host :global(.map-container .me-tpc[data-mastery='unset']) {
    border-color: var(--color-rule-2) !important;
  }
</style>
