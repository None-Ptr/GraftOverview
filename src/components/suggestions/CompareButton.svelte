<script lang="ts">
  import Button from '$lib/components/common/Button.svelte';
  import Icon from '$lib/components/common/Icon.svelte';
  import { currentLocale, t } from '$lib/i18n';
  import { workspaceStore } from '$lib/state/workspace.svelte';
  import { llmState } from '$lib/state/llm.svelte';
  import { ui } from '$lib/state/ui.svelte';
  import { compareController } from '$lib/compare/controller.svelte';
  import { estimateComparison } from '$lib/llm/estimate';
  import { formatTokens } from '$lib/llm/tokens';

  let hasTarget = $derived(workspaceStore.hasTarget);
  let running = $derived(ui.compareProgress?.running ?? false);
  let stale = $derived(ui.stale && workspaceStore.comparison !== null);
  let resume = $derived(ui.resumeAvailable);
  let inSession = $derived(workspaceStore.sessionActive);
  let fresh = $derived(compareController.isFresh());

  let estimate = $derived.by(() => {
    const target = workspaceStore.target;
    if (!target || !llmState.hasKey) return null;
    return estimateComparison(
      workspaceStore.map,
      target,
      llmState.settings,
      currentLocale(),
      ui.compareScope,
    );
  });

  $effect(() => {
    compareController.consume(ui.compareRequested);
  });

  function handle(): void {
    if (inSession) return;
    if (resume) {
      compareController.resume();
      return;
    }
    if (!hasTarget) {
      ui.targetPickerOpen = true;
      return;
    }
    if (!llmState.hasKey) {
      ui.settingsOpen = true;
      return;
    }
    ui.requestCompare();
  }
</script>

<div class="compare">
  {#if estimate && !running}
    <span
      class="cost"
      title={t('compare.estimate.title', {
        input: estimate.input,
        output: estimate.output,
        total: estimate.total,
        requests: estimate.requests,
      })}
    >
      {fresh
        ? t('compare.estimate.fresh')
        : t('compare.estimate', { tokens: formatTokens(estimate.total) })}
    </span>
  {/if}
  <Button
    variant="primary"
    disabled={running || inSession}
    loading={running}
    title={inSession
      ? t('session.compareDisabled')
      : !hasTarget
        ? t('compare.noTarget')
        : !llmState.hasKey
          ? t('compare.noKey')
          : undefined}
    onclick={handle}
  >
    <span class="label-desktop">
      {resume ? t('compare.resume.action') : stale ? t('compare.stale.action') : t('compare.button')}
    </span>
    <span class="label-mobile">{t('common.compareShort')}</span>
    <Icon name="arrow-right" size={16} />
  </Button>
</div>

<style>
  .compare {
    display: inline-flex;
    align-items: center;
    gap: var(--spacing-xs);
  }
  .cost {
    font-family: var(--font-mono);
    font-size: var(--text-2xs);
    letter-spacing: 0.04em;
    color: var(--color-muted);
    white-space: nowrap;
  }
  .label-mobile {
    display: none;
  }
  @media (max-width: 1180px) {
    .cost {
      display: none;
    }
  }
  @media (max-width: 400px) {
    .label-desktop {
      display: none;
    }
    .label-mobile {
      display: inline;
    }
  }
</style>
