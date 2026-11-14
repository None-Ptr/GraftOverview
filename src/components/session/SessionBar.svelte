<script lang="ts">
  import { onMount } from 'svelte';
  import Button from '$lib/components/common/Button.svelte';
  import { currentLocale, t } from '$lib/i18n';
  import { workspaceStore } from '$lib/state/workspace.svelte';
  import { llmState } from '$lib/state/llm.svelte';
  import { ui } from '$lib/state/ui.svelte';
  import { sessionController } from '$lib/session/controller.svelte';
  import { estimateComparison } from '$lib/llm/estimate';
  import { formatTokens } from '$lib/llm/tokens';

  /** Above this estimate the submit needs an explicit second click. */
  const CONFIRM_THRESHOLD = 20_000;

  let session = $derived(workspaceStore.session);
  let now = $state(Date.now());
  let confirming = $state(false);

  onMount(() => {
    const timer = setInterval(() => (now = Date.now()), 1000);
    return () => clearInterval(timer);
  });

  let elapsed = $derived.by(() => {
    if (!session) return '0:00';
    const end = session.submittedAt ? Date.parse(session.submittedAt) : now;
    const seconds = Math.max(0, Math.floor((end - Date.parse(session.startedAt)) / 1000));
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const rest = seconds % 60;
    if (hours > 0) {
      return `${hours}:${String(minutes).padStart(2, '0')}:${String(rest).padStart(2, '0')}`;
    }
    return `${minutes}:${String(rest).padStart(2, '0')}`;
  });

  let estimate = $derived.by(() => {
    if (!session) return null;
    return estimateComparison(
      session.attempt,
      session.targetSnapshot,
      llmState.settings,
      currentLocale(),
      null,
    );
  });

  function askSubmit(): void {
    if (estimate && estimate.total > CONFIRM_THRESHOLD) {
      confirming = true;
      return;
    }
    void sessionController.submit();
  }

  function confirmSubmit(): void {
    confirming = false;
    void sessionController.submit();
  }

  function abandon(): void {
    workspaceStore.abandonSession();
    confirming = false;
  }
</script>

{#if session}
  <div class="bar" role="status">
    <span class="mode" class:test={session.mode === 'test'}>
      {t(session.mode === 'test' ? 'session.mode.test' : 'session.mode.practice')}
    </span>
    <span class="timer tabular">{elapsed}</span>

    {#if session.status === 'active'}
      {#if confirming}
        <span class="confirm">{t('session.confirm', { tokens: formatTokens(estimate?.total ?? 0) })}</span>
        <Button variant="small" onclick={confirmSubmit}>{t('session.confirm.yes')}</Button>
        <Button variant="ghost" onclick={() => (confirming = false)}>{t('common.cancel')}</Button>
      {:else}
        <span class="cost">≈{formatTokens(estimate?.total ?? 0)} tokens</span>
        <Button
          variant="primary"
          disabled={sessionController.submitting}
          loading={sessionController.submitting}
          onclick={askSubmit}
        >
          {t('session.submit')}
        </Button>
        <Button variant="ghost" onclick={abandon}>{t('session.abandon')}</Button>
      {/if}
    {:else if session.status === 'locked'}
      <span class="cost">{t('session.locked')}</span>
      <Button
        variant="primary"
        loading={sessionController.submitting}
        onclick={() => void sessionController.retry()}
      >
        {t('session.retry')}
      </Button>
      <Button variant="ghost" onclick={abandon}>{t('session.abandon')}</Button>
    {:else}
      <span class="cost">{t('session.submittedHint')}</span>
      <Button variant="primary" onclick={() => (ui.sessionReviewOpen = true)}>
        {t('session.review')}
      </Button>
    {/if}
  </div>
{/if}

<style>
  .bar {
    position: absolute;
    top: 12px;
    left: 50%;
    z-index: var(--z-raised);
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--spacing-xs);
    max-width: calc(100% - 32px);
    padding: 4px 4px 4px var(--spacing-sm);
    border: 1px solid var(--color-rule);
    border-radius: var(--radius-control);
    background: var(--color-paper);
    box-shadow: var(--shadow-whisper);
    transform: translateX(-50%);
  }
  .mode {
    font-size: var(--text-xs);
    font-weight: 600;
    color: var(--color-ink-2);
    white-space: nowrap;
  }
  .mode.test {
    color: var(--color-accent);
  }
  .timer {
    font-family: var(--font-mono);
    font-size: var(--text-2xs);
    color: var(--color-muted);
  }
  .cost,
  .confirm {
    font-size: var(--text-2xs);
    color: var(--color-muted);
    white-space: nowrap;
  }
  @media (max-width: 640px) {
    .bar {
      top: 8px;
      left: 8px;
      right: 8px;
      max-width: none;
      justify-content: center;
      transform: none;
    }
  }
</style>
