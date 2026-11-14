<script lang="ts">
  import type { HistoryEntry } from '$lib/types';
  import { historyState } from '$lib/state/history.svelte';
  import { t } from '$lib/i18n';
  import { toast } from '$lib/state/toast.svelte';
  import EmptyState from '$lib/components/common/EmptyState.svelte';
  import Button from '$lib/components/common/Button.svelte';
  import { buildHistoryReport, downloadText, timestampStamp } from '$lib/export/markdown';

  let expandedId = $state<string | null>(null);
  let confirmingClear = $state(false);

  function toggle(entry: HistoryEntry): void {
    expandedId = expandedId === entry.id ? null : entry.id;
  }

  function formatDate(iso: string): string {
    return new Date(iso).toLocaleString();
  }

  function exportEntry(entry: HistoryEntry): void {
    downloadText(`graft-report-${timestampStamp()}.md`, buildHistoryReport(entry), 'text/markdown');
    toast.info(t('history.exportDone'));
  }

  function clear(): void {
    historyState.clear();
    confirmingClear = false;
    expandedId = null;
    toast.info(t('history.cleared'));
  }
</script>

<div class="head">
  <span class="title">{t('history.recent')}</span>
  {#if historyState.entries.length > 0}
    <Button variant="small" onclick={() => (confirmingClear = true)}>{t('history.clear')}</Button>
  {/if}
</div>

{#if confirmingClear}
  <div class="confirm" role="alertdialog">
    <p>{t('history.clearConfirm')}</p>
    <div class="confirm-actions">
      <Button variant="ghost" onclick={() => (confirmingClear = false)}>{t('common.cancel')}</Button>
      <Button variant="primary" tone="error" onclick={clear}>{t('history.clear')}</Button>
    </div>
  </div>
{/if}

{#if historyState.entries.length === 0}
  <EmptyState title={t('history.empty')} body={t('history.emptyBody')} compact />
{:else}
  <ul class="list">
    {#each historyState.entries as entry (entry.id)}
      <li class="item">
        <button type="button" class="row" aria-expanded={expandedId === entry.id} onclick={() => toggle(entry)}>
          <span class="date tabular">{formatDate(entry.createdAt)}</span>
          <span class="name">{entry.targetTitle}</span>
          <span class="coverage tabular">{t('history.coverage', { percent: Math.round(entry.stats.coverage * 100) })}</span>
          <span class="gaps tabular">{t('history.gaps', { count: entry.stats.gapNodes })}</span>
        </button>
        {#if expandedId === entry.id}
          <div class="detail">
            <p class="detail-title">{t('history.detail')}</p>
            <p class="tabular">
              {t('suggest.coverageMeta', {
                target: entry.stats.targetNodes,
                covered: entry.stats.matchedNodes,
                missing: entry.stats.gapNodes,
              })}
            </p>
            <Button variant="small" onclick={() => exportEntry(entry)}>{t('history.export')}</Button>
          </div>
        {/if}
      </li>
    {/each}
  </ul>
  <p class="note">{t('history.note')}</p>
{/if}

<style>
  .head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: var(--spacing-sm);
  }
  .title {
    font-size: var(--text-xs);
    font-weight: 600;
    color: var(--color-muted);
  }
  .confirm {
    margin-bottom: var(--spacing-sm);
    padding: var(--spacing-sm);
    border: 1px solid var(--color-error);
    border-radius: var(--radius-control);
    background: var(--color-error-surface);
  }
  .confirm p {
    margin: 0 0 var(--spacing-xs);
    font-size: var(--text-xs);
    color: var(--color-ink-2);
  }
  .confirm-actions {
    display: flex;
    justify-content: flex-end;
    gap: var(--spacing-xs);
  }
  .list {
    margin: 0;
    padding: 0;
    list-style: none;
  }
  .item {
    border-bottom: 1px solid var(--color-rule);
  }
  .row {
    display: grid;
    grid-template-columns: 1fr auto;
    grid-template-areas:
      'date coverage'
      'name gaps';
    gap: 2px var(--spacing-xs);
    width: 100%;
    padding: var(--spacing-xs) 0;
    border: 0;
    background: none;
    text-align: left;
  }
  .row:hover {
    background: var(--color-paper-2);
  }
  .row:focus-visible {
    outline: 2px solid var(--color-focus);
    outline-offset: -2px;
  }
  .date {
    grid-area: date;
    font-family: var(--font-mono);
    font-size: var(--text-2xs);
    color: var(--color-muted);
  }
  .name {
    grid-area: name;
    overflow: hidden;
    font-size: var(--text-sm);
    color: var(--color-ink);
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .coverage,
  .gaps {
    font-family: var(--font-mono);
    font-size: var(--text-2xs);
    color: var(--color-muted);
    text-align: right;
  }
  .coverage {
    grid-area: coverage;
  }
  .gaps {
    grid-area: gaps;
  }
  .detail {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: var(--spacing-2xs);
    padding: 0 0 var(--spacing-sm);
    font-size: var(--text-xs);
    color: var(--color-ink-2);
  }
  .detail p {
    margin: 0;
  }
  .detail-title {
    font-weight: 600;
    color: var(--color-muted);
  }
  .note {
    padding: var(--spacing-sm) 0;
    font-size: var(--text-xs);
    color: var(--color-muted);
  }
</style>
