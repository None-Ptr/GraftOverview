<script lang="ts">
  import Icon from '../common/Icon.svelte';
  import { t } from '$lib/i18n';
  import { ui } from '$lib/state/ui.svelte';
  import { workspaceStore } from '$lib/state/workspace.svelte';
  import { searchNodes, type SearchResult } from '$lib/map/search';

  let query = $state('');
  let results = $state<SearchResult[]>([]);
  let active = $state(0);
  let inputEl = $state<HTMLInputElement | null>(null);
  let popEl = $state<HTMLDivElement | null>(null);
  let timer: ReturnType<typeof setTimeout> | undefined;

  $effect(() => {
    if (ui.searchOpen) {
      query = '';
      results = [];
      active = 0;
      requestAnimationFrame(() => inputEl?.focus());
    }
  });

  $effect(() => {
    if (!ui.searchOpen) return;
    const onPointerDown = (event: PointerEvent): void => {
      if (popEl && !popEl.contains(event.target as Node)) ui.searchOpen = false;
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  });

  function onInput(): void {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      results = searchNodes(workspaceStore.map, query);
      active = 0;
    }, 250);
  }

  function onKeydown(event: KeyboardEvent): void {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      active = Math.min(active + 1, results.length - 1);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      active = Math.max(active - 1, 0);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const result = results[active];
      if (result) locate(result);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      ui.searchOpen = false;
    }
  }

  function locate(result: SearchResult): void {
    ui.requestLocate(result.nodeId);
    ui.searchOpen = false;
  }

  function parts(topic: string, q: string): { before: string; hit: string; after: string } {
    const needle = q.trim().toLowerCase();
    if (!needle) return { before: topic, hit: '', after: '' };
    const index = topic.toLowerCase().indexOf(needle);
    if (index < 0) return { before: topic, hit: '', after: '' };
    return {
      before: topic.slice(0, index),
      hit: topic.slice(index, index + needle.length),
      after: topic.slice(index + needle.length),
    };
  }
</script>

{#if ui.searchOpen}
  <div class="popover" bind:this={popEl} role="dialog" aria-label={t('map.search.title')}>
    <div class="input-row">
      <Icon name="search" size={16} />
      <input
        bind:this={inputEl}
        bind:value={query}
        type="text"
        placeholder={t('map.search.placeholder')}
        aria-label={t('map.search.title')}
        oninput={onInput}
        onkeydown={onKeydown}
      />
      <kbd>Ctrl F</kbd>
    </div>
    <div class="results" aria-live="polite">
      {#if query.trim() && results.length === 0}
        <p class="empty">{t('map.search.empty')}</p>
      {:else if results.length > 0}
        <p class="count tabular">{t('map.search.results', { count: results.length })}</p>
        {#each results as result, i (result.nodeId)}
          <button
            type="button"
            class="row"
            class:active={i === active}
            onmouseenter={() => (active = i)}
            onclick={() => locate(result)}
          >
            <span class="topic">
              {parts(result.topic, query).before}<mark>{parts(result.topic, query).hit}</mark
              >{parts(result.topic, query).after}
            </span>
            <span class="path">{result.path.slice(0, -1).join(' / ')}</span>
          </button>
        {/each}
      {/if}
    </div>
  </div>
{/if}

<style>
  .popover {
    position: fixed;
    top: 56px;
    right: 16px;
    z-index: var(--z-dropdown);
    width: 320px;
    border: 1px solid var(--color-rule);
    border-radius: var(--radius-panel);
    background: var(--color-paper);
    box-shadow: var(--shadow-dialog);
  }
  .input-row {
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
    height: 40px;
    padding: 0 var(--spacing-sm);
    border-bottom: 1px solid var(--color-rule);
    color: var(--color-muted);
  }
  input {
    flex: 1;
    min-width: 0;
    border: 0;
    background: none;
    color: var(--color-ink-2);
    font-size: var(--text-sm);
  }
  input:focus-visible {
    outline: none;
  }
  kbd {
    font-family: var(--font-mono);
    font-size: var(--text-2xs);
    color: var(--color-muted);
  }
  .results {
    max-height: 320px;
    overflow: auto;
    padding: var(--spacing-2xs);
  }
  .count,
  .empty {
    margin: var(--spacing-2xs) var(--spacing-xs);
    font-size: var(--text-xs);
    color: var(--color-muted);
  }
  .count {
    font-family: var(--font-mono);
  }
  .row {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 2px;
    width: 100%;
    min-height: 32px;
    padding: var(--spacing-2xs) var(--spacing-xs);
    border: 0;
    border-radius: var(--radius-control);
    background: none;
    text-align: left;
  }
  .row:hover,
  .row.active {
    background: var(--color-paper-2);
  }
  .row:focus-visible {
    outline: 2px solid var(--color-focus);
    outline-offset: -2px;
  }
  .topic {
    font-size: var(--text-sm);
    color: var(--color-ink-2);
  }
  mark {
    background: var(--color-accent-surface);
    color: var(--color-accent-active);
  }
  .path {
    font-family: var(--font-mono);
    font-size: var(--text-2xs);
    color: var(--color-muted);
  }
  @media (max-width: 640px) {
    .popover {
      top: 48px;
      right: 12px;
      left: 12px;
      width: auto;
    }
    .row {
      min-height: 44px;
    }
  }
</style>
