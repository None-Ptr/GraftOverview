<script lang="ts">
  import type { GapSuggestion, Priority } from '$lib/types';
  import { t } from '$lib/i18n';
  import { workspaceStore } from '$lib/state/workspace.svelte';
  import { historyState } from '$lib/state/history.svelte';
  import { ui } from '$lib/state/ui.svelte';
  import { diffComparisons, findPreviousComparison, signedPercent } from '$lib/compare/diff';
  import { findTreeNode } from '$lib/compare/scope';
  import EmptyState from '$lib/components/common/EmptyState.svelte';
  import Button from '$lib/components/common/Button.svelte';
  import Tag from '$lib/components/common/Tag.svelte';
  import {
    adoptGap,
    adoptGaps,
    ignoreGap,
    ignoreGaps,
    restoreIgnored,
  } from '$lib/compare/apply';

  const ORDER: Record<Priority, number> = { high: 0, medium: 1, low: 2 };

  let comparison = $derived(workspaceStore.comparison);
  let pending = $derived(
    (comparison?.gaps ?? [])
      .filter((gap) => gap.status === 'pending')
      .sort((a, b) => ORDER[a.priority] - ORDER[b.priority]),
  );
  let ignoredGaps = $derived((comparison?.gaps ?? []).filter((gap) => gap.status === 'ignored'));
  let stats = $derived(comparison?.stats ?? null);
  let selected = $state<string[]>([]);
  let expanded = $state<string[]>([]);
  let showIgnored = $state(false);

  let groups = $derived(
    (['high', 'medium', 'low'] as Priority[])
      .map((priority) => ({ priority, gaps: pending.filter((gap) => gap.priority === priority) }))
      .filter((group) => group.gaps.length > 0),
  );
  let allSelected = $derived(pending.length > 0 && pending.every((gap) => selected.includes(gap.signature)));

  let diff = $derived.by(() =>
    diffComparisons(findPreviousComparison(historyState.entries, comparison), comparison),
  );

  function toggleSelect(signature: string): void {
    selected = selected.includes(signature)
      ? selected.filter((item) => item !== signature)
      : [...selected, signature];
  }

  function toggleAll(): void {
    selected = allSelected ? [] : pending.map((gap) => gap.signature);
  }

  function toggleExpand(signature: string): void {
    expanded = expanded.includes(signature)
      ? expanded.filter((item) => item !== signature)
      : [...expanded, signature];
  }

  function doAdopt(gap: GapSuggestion): void {
    adoptGap(gap.signature);
    selected = selected.filter((item) => item !== gap.signature);
  }

  function doIgnore(gap: GapSuggestion): void {
    ignoreGap(gap.signature);
    selected = selected.filter((item) => item !== gap.signature);
  }

  function adoptSelected(): void {
    adoptGaps(selected);
    selected = [];
  }

  function ignoreSelected(): void {
    ignoreGaps(selected);
    selected = [];
  }

  function locate(gap: GapSuggestion): void {
    ui.requestLocate(gap.targetId);
    if (typeof window !== 'undefined' && window.matchMedia('(max-width: 960px)').matches) {
      ui.panelOpen = false;
    }
  }
</script>

{#if !comparison || !stats}
  <EmptyState title={t('suggest.empty.title')} body={t('suggest.empty.body')} compact />
{:else}
  {#if ui.stale}
    <div class="stale" role="status">
      <div>
        <strong>{t('suggest.staleTitle')}</strong>
        <span>{t('compare.stale.detail')}</span>
      </div>
      <Button variant="small" onclick={() => ui.requestCompare()}>{t('compare.stale.action')}</Button>
    </div>
  {/if}

  <div class="coverage">
    {#if ui.compareScope}
      {@const scoped = workspaceStore.target
        ? findTreeNode(workspaceStore.target.root, ui.compareScope)
        : null}
      <div class="scope" role="status">
        <span class="scope-label">{t('compare.scope.active', { name: scoped?.topic ?? '' })}</span>
        <Button
          variant="small"
          onclick={() => {
            ui.setCompareScope(null);
            ui.requestCompare();
          }}
        >
          {t('compare.scope.reset')}
        </Button>
      </div>
    {/if}
    <div class="coverage-head">
      <span>{t('common.coverage')}</span>
      <span class="tabular">{Math.round(stats.coverage * 100)}%</span>
    </div>
    <div class="bar" aria-hidden="true">
      <span style:width={`${Math.round(stats.coverage * 100)}%`}></span>
    </div>
    <p class="meta tabular">
      {t('suggest.coverageMeta', {
        target: stats.targetNodes,
        covered: stats.matchedNodes,
        missing: stats.gapNodes,
      })}
    </p>
    {#if diff}
      <div class="diff" role="status">
        <span class="diff-title">{t('compare.diff.title')}</span>
        <span class="tabular">{t('compare.diff.coverage', { delta: signedPercent(diff.coverageDelta) })}</span>
        {#if diff.newGaps.length > 0}
          <span class="up tabular">{t('compare.diff.new', { count: diff.newGaps.length })}</span>
        {/if}
        {#if diff.resolvedGaps.length > 0}
          <span class="down tabular">{t('compare.diff.resolved', { count: diff.resolvedGaps.length })}</span>
        {/if}
      </div>
    {/if}
  </div>

  {#if pending.length === 0}
    <EmptyState title={t('suggest.allAdopted')} body={t('suggest.empty.body')} compact />
  {:else}
    <div class="list-head">
      <label class="select-all">
        <input type="checkbox" checked={allSelected} onchange={toggleAll} />
        <span>{t('suggest.selectAll')}</span>
      </label>
      <span class="tabular">{t('suggest.selected', { count: selected.length })}</span>
    </div>

    {#each groups as group (group.priority)}
      <section class="group">
        <h3 class="group-title">
          <span class="prio {group.priority}">{t(`suggest.priority.${group.priority}`)}</span>
          <Tag>{group.gaps.length}</Tag>
        </h3>
        {#each group.gaps as gap (gap.signature)}
          <article class="card" class:checked={selected.includes(gap.signature)}>
            <div class="card-head">
              <input
                type="checkbox"
                checked={selected.includes(gap.signature)}
                aria-label={gap.topic}
                onchange={() => toggleSelect(gap.signature)}
              />
              <button
                type="button"
                class="title"
                aria-expanded={expanded.includes(gap.signature)}
                onclick={() => toggleExpand(gap.signature)}
              >
                {gap.topic}
              </button>
              <span class="count tabular">{t('suggest.nodeCount', { count: gap.nodeCount })}</span>
            </div>

            <p class="reason" class:clamp={!expanded.includes(gap.signature)}>{gap.reason}</p>

            <div class="tags">
              <Tag>{t('suggest.tag')}</Tag>
              <span class="tabular">{t('suggest.selfCheckCount', { count: gap.selfCheck.length })}</span>
              {#if gap.links.length > 0}
                <span class="tabular">{t('suggest.linkCount', { count: gap.links.length })}</span>
              {/if}
            </div>

            {#if expanded.includes(gap.signature)}
              <div class="details">
                <p class="detail-label">{t('suggest.reason')}</p>
                <ul class="checks">
                  {#each gap.selfCheck as check, i (`${gap.signature}-${i}`)}
                    <li>{check}</li>
                  {/each}
                </ul>
                {#if gap.links.length > 0}
                  <p class="detail-label">
                    {t('suggest.links')} · <em>{t('suggest.unverifiedLinks')}</em>
                  </p>
                  <ul class="links">
                    {#each gap.links as link (link.url)}
                      <li>
                        <a href={link.url} target="_blank" rel="noopener noreferrer">{link.title}</a>
                      </li>
                    {/each}
                  </ul>
                {/if}
                <p class="attached">
                  {gap.suggestedParentId ? '' : t('suggest.attachedRoot')}
                </p>
              </div>
            {/if}

            <div class="actions">
              <Button variant="small" onclick={() => locate(gap)}>{t('suggest.locate')}</Button>
              <Button variant="small" onclick={() => doIgnore(gap)}>{t('suggest.ignore')}</Button>
              <Button variant="small" tone="success" onclick={() => doAdopt(gap)}>{t('suggest.adopt')}</Button>
            </div>
          </article>
        {/each}
      </section>
    {/each}

    {#if selected.length > 0}
      <div class="footer">
        <span class="tabular">{t('suggest.selected', { count: selected.length })}</span>
        <span class="spacer"></span>
        <Button variant="small" onclick={ignoreSelected}>{t('suggest.ignoreSelected')}</Button>
        <Button variant="small" tone="success" onclick={adoptSelected}>{t('suggest.adoptSelected')}</Button>
      </div>
    {/if}
  {/if}

  {#if ignoredGaps.length > 0}
    <section class="ignored">
      <button type="button" class="ignored-toggle" onclick={() => (showIgnored = !showIgnored)}>
        {t('suggest.ignoredSection')} ({ignoredGaps.length})
        <span>{showIgnored ? t('suggest.hideIgnored') : t('suggest.showIgnored')}</span>
      </button>
      {#if showIgnored}
        {#each ignoredGaps as gap (gap.signature)}
          <div class="ignored-row">
            <span class="ignored-topic">{gap.topic}</span>
            <Button variant="small" onclick={() => restoreIgnored(gap.signature)}>
              {t('suggest.restore')}
            </Button>
          </div>
        {/each}
      {/if}
    </section>
  {/if}
{/if}

<style>
  .stale {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--spacing-sm);
    margin-bottom: var(--spacing-sm);
    padding: var(--spacing-xs) var(--spacing-sm);
    border: 1px solid var(--color-gap);
    border-radius: var(--radius-control);
    background: var(--color-gap-surface);
  }
  .stale strong {
    display: block;
    font-size: var(--text-sm);
    color: var(--color-ink);
  }
  .stale span {
    font-size: var(--text-xs);
    color: var(--color-gap-ink);
  }

  .coverage {
    margin-bottom: var(--spacing-md);
  }
  .scope {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--spacing-xs);
    margin-bottom: var(--spacing-sm);
    padding: var(--spacing-2xs) var(--spacing-xs);
    border: 1px solid var(--color-accent);
    border-radius: var(--radius-control);
    background: var(--color-accent-surface);
  }
  .scope-label {
    font-size: var(--text-xs);
    color: var(--color-accent-active);
  }
  .coverage-head {
    display: flex;
    justify-content: space-between;
    font-size: var(--text-xs);
    color: var(--color-muted);
  }
  .bar {
    height: 4px;
    margin: var(--spacing-2xs) 0;
    border-radius: var(--radius-pill);
    background: var(--color-paper-3);
    overflow: hidden;
  }
  .bar span {
    display: block;
    height: 100%;
    background: var(--color-matched);
  }
  .meta {
    margin: 0;
    font-family: var(--font-mono);
    font-size: var(--text-2xs);
    color: var(--color-muted);
  }
  .diff {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--spacing-xs);
    margin-top: var(--spacing-xs);
    padding: var(--spacing-2xs) var(--spacing-xs);
    border: 1px solid var(--color-rule);
    border-radius: var(--radius-control);
    background: var(--color-paper-2);
    font-size: var(--text-xs);
    color: var(--color-ink-2);
  }
  .diff-title {
    font-weight: 600;
    color: var(--color-muted);
  }
  .diff .up {
    color: var(--color-gap-ink);
  }
  .diff .down {
    color: var(--color-matched-ink);
  }

  .list-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: var(--spacing-xs);
    font-size: var(--text-xs);
    color: var(--color-muted);
  }
  .select-all {
    display: inline-flex;
    align-items: center;
    gap: var(--spacing-xs);
  }
  .select-all input,
  .card-head input {
    width: 16px;
    height: 16px;
    accent-color: var(--color-accent);
  }

  .group {
    margin-bottom: var(--spacing-md);
  }
  .group-title {
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
    margin: 0 0 var(--spacing-2xs);
    font-size: var(--text-xs);
    font-weight: 600;
  }
  .prio.high {
    color: var(--color-gap-ink);
  }
  .prio.medium {
    color: var(--color-ink-2);
  }
  .prio.low {
    color: var(--color-muted);
  }

  .card {
    padding: var(--spacing-sm);
    margin-bottom: var(--spacing-xs);
    border: 1px solid var(--color-rule);
    border-radius: var(--radius-panel);
    background: var(--color-paper);
  }
  .card.checked {
    border-color: var(--color-accent);
    background: var(--color-accent-surface);
  }
  .card-head {
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
  }
  .title {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    padding: 0;
    border: 0;
    background: none;
    color: var(--color-ink);
    font-size: var(--text-sm);
    font-weight: 600;
    text-align: left;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .title:focus-visible {
    outline: 2px solid var(--color-focus);
    outline-offset: 2px;
  }
  .count {
    flex: none;
    font-family: var(--font-mono);
    font-size: var(--text-2xs);
    color: var(--color-muted);
  }
  .reason {
    margin: var(--spacing-2xs) 0 0;
    font-size: var(--text-xs);
    line-height: var(--leading-ui);
    color: var(--color-ink-2);
  }
  .reason.clamp {
    display: -webkit-box;
    -webkit-line-clamp: 3;
    line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  .tags {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--spacing-xs);
    margin-top: var(--spacing-2xs);
    font-family: var(--font-mono);
    font-size: var(--text-2xs);
    color: var(--color-muted);
  }
  .details {
    margin-top: var(--spacing-xs);
    padding-top: var(--spacing-xs);
    border-top: 1px dashed var(--color-rule-2);
  }
  .detail-label {
    margin: var(--spacing-2xs) 0;
    font-size: var(--text-2xs);
    font-weight: 600;
    color: var(--color-muted);
  }
  .detail-label em {
    font-style: normal;
    font-weight: 400;
  }
  .checks,
  .links {
    margin: 0;
    padding-left: var(--spacing-md);
    font-size: var(--text-xs);
    color: var(--color-ink-2);
  }
  .links a {
    color: var(--color-accent);
    text-decoration: underline;
    text-underline-offset: 2px;
  }
  .attached {
    margin: var(--spacing-2xs) 0 0;
    font-size: var(--text-2xs);
    color: var(--color-gap-ink);
  }
  .actions {
    display: flex;
    flex-wrap: wrap;
    gap: var(--spacing-2xs);
    margin-top: var(--spacing-xs);
  }

  .footer {
    position: sticky;
    bottom: 0;
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
    padding: var(--spacing-xs) 0;
    background: var(--color-paper);
  }
  .spacer {
    flex: 1;
  }

  .ignored {
    margin-top: var(--spacing-md);
    border-top: 1px solid var(--color-rule);
    padding-top: var(--spacing-xs);
  }
  .ignored-toggle {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    padding: var(--spacing-2xs) 0;
    border: 0;
    background: none;
    color: var(--color-muted);
    font-size: var(--text-xs);
    text-align: left;
  }
  .ignored-toggle span {
    font-family: var(--font-mono);
    font-size: var(--text-2xs);
  }
  .ignored-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--spacing-xs);
    padding: var(--spacing-2xs) 0;
  }
  .ignored-topic {
    overflow: hidden;
    font-size: var(--text-sm);
    color: var(--color-ink-2);
    text-overflow: ellipsis;
    white-space: nowrap;
  }
</style>
