<script lang="ts">
  import type { KnowledgeNode } from '$lib/types';
  import { t } from '$lib/i18n';
  import { goWorkspace } from '$lib/router';
  import { decodeShare } from '$lib/share/decode';
  import { workspaceStore } from '$lib/state/workspace.svelte';
  import { countNodes } from '$lib/target/outline';
  import { downloadText } from '$lib/export/markdown';
  import Button from '$lib/components/common/Button.svelte';
  import ReadOnlyMap from './ReadOnlyMap.svelte';

  interface Props {
    data?: string | null;
    invalid?: boolean;
  }

  let { data = null, invalid = false }: Props = $props();

  let payload = $derived(decodeShare(data));
  let confirming = $state(false);
  let expanded = $state<string[]>([]);

  let mapCount = $derived(payload ? countNodes(payload.m.root) : 0);
  let targetCount = $derived(payload ? countNodes(payload.t.root) : 0);

  function importIt(): void {
    if (!payload) return;
    workspaceStore.importWorkspace({
      schemaVersion: 1,
      map: payload.m,
      target: payload.t,
      comparison: null,
      ignoredSignatures: [],
      ui: { locale: workspaceStore.workspace.ui.locale, panelTab: 'target' },
    });
    goWorkspace();
  }

  function download(): void {
    if (!payload) return;
    downloadText('graft-share.json', JSON.stringify(payload, null, 2), 'application/json');
  }

  function toggle(id: string): void {
    expanded = expanded.includes(id)
      ? expanded.filter((item) => item !== id)
      : [...expanded, id];
  }
</script>

{#snippet tree(node: KnowledgeNode, depth: number)}
  <div class="node-wrap" style:margin-left={`${depth * 14}px`}>
    <button
      type="button"
      class="node"
      aria-expanded={expanded.includes(node.id)}
      onclick={() => toggle(node.id)}
    >
      <span class="dot"></span>
      <span class="topic">{node.topic}</span>
      {#if node.note}<span class="note-mark" aria-hidden="true">·</span>{/if}
    </button>
    {#if expanded.includes(node.id)}
      <p class="note">{node.note ?? t('target.detail.noNote')}</p>
    {/if}
  </div>
  {#each node.children as child (child.id)}
    {@render tree(child, depth + 1)}
  {/each}
{/snippet}

<div class="share">
  <header class="banner">
    <span class="tag">{t('share.banner')}</span>
    <span class="spacer"></span>
    <Button variant="small" onclick={goWorkspace}>{t('share.openWorkspace')}</Button>
  </header>

  {#if invalid || !payload}
    <main class="content">
      <h1>{t('share.invalid.title')}</h1>
      <p>{t('share.invalid.body')}</p>
    </main>
  {:else}
    <main class="content">
      <div class="title-row">
        <div class="title-block">
          <h1>{payload.m.title}</h1>
          <p class="stats tabular">
            {t('share.stats', { map: mapCount, target: targetCount })}
          </p>
        </div>
        <div class="actions">
          <Button variant="ghost" onclick={download}>{t('share.download')}</Button>
          <Button variant="primary" onclick={() => (confirming = true)}>{t('share.import')}</Button>
        </div>
      </div>

      {#if confirming}
        <div class="confirm" role="alertdialog">
          <p>{t('share.confirm')}</p>
          <div class="confirm-actions">
            <Button variant="ghost" onclick={() => (confirming = false)}>{t('common.cancel')}</Button>
            <Button variant="primary" onclick={importIt}>{t('share.confirmAction')}</Button>
          </div>
        </div>
      {/if}

      <section class="block">
        <h2>{t('share.readonlyMap')}</h2>
        <div class="canvas-frame">
          <ReadOnlyMap map={payload.m} />
        </div>
      </section>

      <section class="block">
        <h2>{t('share.readonlyTarget')} · {payload.t.title}</h2>
        <p class="hint">{t('share.expandHint')}</p>
        <div class="tree">{@render tree(payload.t.root, 0)}</div>
      </section>
    </main>
  {/if}
</div>

<style>
  .share {
    display: flex;
    flex-direction: column;
    min-height: 100dvh;
    background: var(--color-paper);
  }
  .banner {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    height: 56px;
    padding: 0 var(--spacing-md);
    border-bottom: 1px solid var(--color-rule);
    background: var(--color-accent-surface);
  }
  .tag {
    font-family: var(--font-mono);
    font-size: var(--text-xs);
    letter-spacing: 0.06em;
    color: var(--color-accent-active);
  }
  .spacer {
    flex: 1;
  }
  .content {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-lg);
    width: 100%;
    max-width: 960px;
    margin: 0 auto;
    padding: var(--spacing-xl) var(--spacing-md) var(--spacing-2xl);
  }
  h1 {
    margin: 0;
    font-family: var(--font-display);
    font-size: var(--text-2xl);
    font-weight: 600;
    letter-spacing: -0.03em;
    color: var(--color-ink);
  }
  p {
    margin: 0;
    max-width: 60ch;
    font-size: var(--text-md);
    line-height: var(--leading-body);
    color: var(--color-ink-2);
  }
  .title-row {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: var(--spacing-sm);
  }
  .title-block {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-2xs);
    min-width: 0;
  }
  .stats {
    margin: 0;
    font-family: var(--font-mono);
    font-size: var(--text-2xs);
    letter-spacing: 0.06em;
    color: var(--color-muted);
  }
  .actions {
    display: flex;
    flex-wrap: wrap;
    gap: var(--spacing-xs);
  }
  .confirm {
    padding: var(--spacing-sm) var(--spacing-md);
    border: 1px solid var(--color-gap);
    border-radius: var(--radius-panel);
    background: var(--color-gap-surface);
  }
  .confirm p {
    font-size: var(--text-sm);
  }
  .confirm-actions {
    display: flex;
    justify-content: flex-end;
    gap: var(--spacing-xs);
    margin-top: var(--spacing-xs);
  }
  .block h2 {
    margin: 0 0 var(--spacing-sm);
    font-family: var(--font-display);
    font-size: var(--text-md);
    font-weight: 600;
    color: var(--color-ink);
  }
  .hint {
    margin: 0 0 var(--spacing-xs);
    font-size: var(--text-xs);
    color: var(--color-muted);
  }
  .canvas-frame {
    border: 1px solid var(--color-rule);
    border-radius: var(--radius-panel);
    background: var(--color-paper);
    overflow: hidden;
  }
  .tree {
    padding: var(--spacing-sm);
    border: 1px solid var(--color-rule);
    border-radius: var(--radius-panel);
    background: var(--color-paper);
  }
  .node-wrap {
    display: flex;
    flex-direction: column;
  }
  .node {
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
    min-height: 30px;
    padding: 0 var(--spacing-xs);
    border: 0;
    border-radius: var(--radius-control);
    background: none;
    text-align: left;
  }
  .node:hover {
    background: var(--color-paper-2);
  }
  .node:focus-visible {
    outline: 2px solid var(--color-focus);
    outline-offset: -2px;
  }
  .dot {
    width: 5px;
    height: 5px;
    flex: none;
    border-radius: var(--radius-pill);
    background: var(--color-neutral);
  }
  .topic {
    overflow: hidden;
    font-size: var(--text-sm);
    color: var(--color-ink-2);
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .note-mark {
    color: var(--color-accent);
  }
  .note {
    margin: 0 0 var(--spacing-2xs) var(--spacing-md);
    font-size: var(--text-xs);
    line-height: var(--leading-ui);
    color: var(--color-muted);
  }
  @media (max-width: 640px) {
    .content {
      padding: var(--spacing-md) var(--spacing-sm) var(--spacing-xl);
    }
    h1 {
      font-size: var(--text-xl);
    }
  }
</style>
