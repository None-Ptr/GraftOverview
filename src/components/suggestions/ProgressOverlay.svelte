<script lang="ts">
  import { t } from '$lib/i18n';
  import { ui } from '$lib/state/ui.svelte';
  import { compareController } from '$lib/compare/controller.svelte';
  import Button from '$lib/components/common/Button.svelte';
  import Spinner from '$lib/components/common/Spinner.svelte';

  let progress = $derived(ui.compareProgress);
  let elapsed = $state('00:00');

  $effect(() => {
    if (!progress?.running) return;
    elapsed = '00:00';
    const timer = setInterval(() => {
      const seconds = Math.floor((Date.now() - progress.startedAt) / 1000);
      elapsed = `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
    }, 1000);
    return () => clearInterval(timer);
  });
</script>

{#if progress?.running}
  <div class="overlay" role="status">
    <Spinner size={16} label={t('compare.running', { count: progress.targetNodes })} />
    <span class="text">{t('compare.progress', { count: progress.targetNodes, time: elapsed })}</span>
    {#if progress.chunksTotal && progress.chunksTotal > 1}
      <span class="chunks tabular">
        {t('compare.chunk.progress', {
          done: progress.chunksDone ?? 0,
          total: progress.chunksTotal,
        })}
      </span>
    {/if}
    <Button variant="small" onclick={() => compareController.cancel()}>{t('compare.cancel')}</Button>
  </div>
{/if}

<style>
  .overlay {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    padding: var(--spacing-xs) var(--spacing-sm);
    border: 1px solid var(--color-rule);
    border-radius: var(--radius-panel);
    background: var(--color-paper);
    box-shadow: var(--shadow-dialog);
    color: var(--color-ink-2);
  }
  .text {
    font-size: var(--text-sm);
    white-space: nowrap;
  }
  .chunks {
    font-family: var(--font-mono);
    font-size: var(--text-2xs);
    letter-spacing: 0.06em;
    color: var(--color-muted);
    white-space: nowrap;
  }
  @media (max-width: 640px) {
    .text {
      white-space: normal;
      font-size: var(--text-xs);
    }
  }
</style>
