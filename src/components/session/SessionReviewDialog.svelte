<script lang="ts">
  import Dialog from '$lib/components/common/Dialog.svelte';
  import Button from '$lib/components/common/Button.svelte';
  import { t } from '$lib/i18n';
  import { workspaceStore } from '$lib/state/workspace.svelte';

  interface Props {
    open?: boolean;
  }

  let { open = $bindable(false) }: Props = $props();

  let session = $derived(workspaceStore.session);
  let stats = $derived(workspaceStore.comparison?.stats ?? null);

  function choose(choice: 'replace' | 'merge' | 'discard'): void {
    workspaceStore.resolveSession(choice);
    open = false;
  }
</script>

<Dialog bind:open title={t('session.review.title')}>
  <div class="form">
    {#if stats}
      <div class="stats">
        <div class="figure">
          <span class="big tabular">{Math.round(stats.coverage * 100)}%</span>
          <span class="caption">{t('session.review.coverage')}</span>
        </div>
        <span class="meta">
          {t('session.review.matched', { count: stats.matchedNodes })} ·
          {t('session.review.gaps', { count: stats.gapNodes })}
        </span>
      </div>
    {/if}
    <p class="body">{t('session.review.body')}</p>
    {#if session?.status === 'submitted'}
      <Button variant="primary" full onclick={() => choose('replace')}>
        {t('session.resolve.replace')}
      </Button>
      <Button variant="ghost" full onclick={() => choose('merge')}>
        {t('session.resolve.merge')}
      </Button>
      <Button variant="ghost" full onclick={() => choose('discard')}>
        {t('session.resolve.discard')}
      </Button>
    {/if}
  </div>
</Dialog>

<style>
  .form {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-sm);
  }
  .stats {
    display: flex;
    align-items: flex-end;
    gap: var(--spacing-sm);
  }
  .figure {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .caption {
    font-size: var(--text-2xs);
    color: var(--color-muted);
  }
  .big {
    font-family: var(--font-display);
    font-size: var(--text-2xl);
    font-weight: 700;
    color: var(--color-ink);
  }
  .meta {
    font-family: var(--font-mono);
    font-size: var(--text-2xs);
    color: var(--color-muted);
  }
  .body {
    margin: 0;
    font-size: var(--text-sm);
    line-height: var(--leading-body);
    color: var(--color-muted);
  }
</style>
