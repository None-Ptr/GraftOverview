<script lang="ts">
  import Button from '../common/Button.svelte';
  import EmptyState from '../common/EmptyState.svelte';
  import { t } from '$lib/i18n';
  import { workspaceStore } from '$lib/state/workspace.svelte';

  let confirming = $state(false);
  let error = $derived(workspaceStore.dataError);

  function downloadRaw(): void {
    const blob = new Blob([workspaceStore.exportRawData()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'graft-workspace-raw.json';
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function reset(): void {
    workspaceStore.resetWorkspace();
    confirming = false;
  }
</script>

<div class="recovery">
  <EmptyState
    title={t('common.dataProblem')}
    body={error?.kind === 'future-version' ? t('common.dataFuture') : t('common.dataCorrupt')}
    hint={t('common.dataRecovery')}
  >
    {#snippet actions()}
      {#if confirming}
        <p class="warn">{t('common.confirmReset')}</p>
        <Button variant="primary" tone="error" onclick={reset}>{t('common.yesReset')}</Button>
        <Button variant="ghost" onclick={() => (confirming = false)}>{t('common.cancel')}</Button>
      {:else}
        <Button variant="ghost" onclick={downloadRaw}>{t('common.exportRaw')}</Button>
        <Button variant="primary" tone="error" onclick={() => (confirming = true)}>
          {t('common.reset')}
        </Button>
      {/if}
    {/snippet}
  </EmptyState>
</div>

<style>
  .recovery {
    display: flex;
    align-items: flex-start;
    justify-content: flex-start;
    height: 100dvh;
    padding: var(--spacing-3xl) var(--spacing-xl);
    background-color: var(--color-paper);
    background-image: radial-gradient(circle at 1px 1px, var(--color-grid) 1px, transparent 0);
    background-size: 24px 24px;
  }
  .warn {
    width: 100%;
    margin: 0;
    font-size: var(--text-sm);
    color: var(--color-error);
  }
</style>
