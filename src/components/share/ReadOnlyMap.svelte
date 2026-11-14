<script lang="ts">
  import { onMount } from 'svelte';
  import MindElixir from 'mind-elixir';
  import 'mind-elixir/style.css';
  import type { KnowledgeMap } from '$lib/types';
  import { toMindElixirData } from '$lib/map/adapter';

  interface Props {
    map: KnowledgeMap;
  }

  let { map }: Props = $props();
  let host = $state<HTMLDivElement | null>(null);

  onMount(() => {
    if (!host) return;
    const instance = new MindElixir({
      el: host,
      direction: MindElixir.RIGHT,
      editable: false,
      contextMenu: false,
      toolBar: false,
      keypress: false,
      allowUndo: false,
      overflowHidden: false,
    });
    void instance.init(toMindElixirData(map, [])).then(() => {
      requestAnimationFrame(() => {
        instance.scaleFit();
        instance.toCenter();
      });
    });
    return () => instance.destroy();
  });
</script>

<div class="host" bind:this={host}></div>

<style>
  .host {
    width: 100%;
    height: 58vh;
    min-height: 360px;
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
    --map-padding: 32px;
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
  @media (max-width: 640px) {
    .host {
      height: 46vh;
      min-height: 280px;
    }
  }
</style>
