<script lang="ts">
  import Dialog from '$lib/components/common/Dialog.svelte';
  import Button from '$lib/components/common/Button.svelte';
  import Tag from '$lib/components/common/Tag.svelte';
  import { t, currentLocale } from '$lib/i18n';
  import { ui } from '$lib/state/ui.svelte';
  import { workspaceStore } from '$lib/state/workspace.svelte';
  import { llmState } from '$lib/state/llm.svelte';
  import { topLevelBranches } from '$lib/compare/scope';
  import { countNodes } from '$lib/compare/serialize';
  import { estimateComparison } from '$lib/llm/estimate';
  import { formatTokens } from '$lib/llm/tokens';

  interface Props {
    open?: boolean;
  }

  let { open = $bindable(false) }: Props = $props();

  let branches = $derived(
    workspaceStore.target ? topLevelBranches(workspaceStore.target.root) : [],
  );

  let estimate = $derived.by(() => {
    const target = workspaceStore.target;
    if (!target) return null;
    return estimateComparison(
      workspaceStore.map,
      target,
      llmState.settings,
      currentLocale(),
      null,
    );
  });

  function pick(scope: string | null): void {
    ui.setCompareScope(scope);
    open = false;
    ui.requestCompare();
  }
</script>

<Dialog bind:open title={t('compare.scope.title')}>
  <div class="form">
    <p class="body">{t('compare.scope.body')}</p>
    {#if estimate}
      <p class="estimate">
        {t('compare.scope.estimate', {
          tokens: formatTokens(estimate.total),
          requests: estimate.requests,
        })}
      </p>
    {/if}
    <div class="list">
      {#each branches as branch (branch.id)}
        <button type="button" class="row" onclick={() => pick(branch.id)}>
          <span class="name">{branch.topic}</span>
          <Tag>{t('target.template.nodes', { count: countNodes(branch) })}</Tag>
        </button>
      {/each}
    </div>
    <Button variant="ghost" full onclick={() => pick(null)}>{t('compare.scope.whole')}</Button>
  </div>
</Dialog>

<style>
  .form {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-sm);
  }
  .body {
    margin: 0;
    font-size: var(--text-sm);
    line-height: var(--leading-body);
    color: var(--color-muted);
  }
  .estimate {
    margin: 0;
    font-family: var(--font-mono);
    font-size: var(--text-2xs);
    letter-spacing: 0.04em;
    color: var(--color-muted);
  }
  .list {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-2xs);
    max-height: 46dvh;
    overflow: auto;
  }
  .row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--spacing-sm);
    min-height: 40px;
    padding: var(--spacing-2xs) var(--spacing-sm);
    border: 1px solid var(--color-rule-2);
    border-radius: var(--radius-control);
    background: var(--color-paper);
    text-align: left;
  }
  .row:hover {
    border-color: var(--color-accent);
    background: var(--color-accent-surface);
  }
  .row:focus-visible {
    outline: 2px solid var(--color-focus);
    outline-offset: 2px;
  }
  .name {
    overflow: hidden;
    font-size: var(--text-sm);
    color: var(--color-ink);
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  @media (pointer: coarse) {
    .row {
      min-height: 44px;
    }
  }
</style>
