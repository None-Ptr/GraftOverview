<script lang="ts">
  import { toast, type ToastItem } from '$lib/state/toast.svelte';
  import Icon from './Icon.svelte';
  import type { IconName } from './icons';
  import { t } from '$lib/i18n';

  interface Props {
    item: ToastItem;
  }

  let { item }: Props = $props();
  let paused = $state(false);

  $effect(() => {
    if (paused) return;
    const timer = setTimeout(() => toast.dismiss(item.id), item.duration);
    return () => clearTimeout(timer);
  });

  let icon = $derived<IconName>(
    item.tone === 'error' ? 'alert' : item.tone === 'success' ? 'check' : 'info',
  );
</script>

<div
  class="toast {item.tone}"
  role={item.tone === 'error' ? 'alert' : 'status'}
  onmouseenter={() => (paused = true)}
  onmouseleave={() => (paused = false)}
  onfocusin={() => (paused = true)}
  onfocusout={() => (paused = false)}
>
  <span class="ic"><Icon name={icon} size={16} /></span>
  <span class="msg">{item.message}</span>
  {#if item.action}
    <button
      class="action"
      type="button"
      onclick={() => {
        item.action?.run();
        toast.dismiss(item.id);
      }}>{item.action.label}</button
    >
  {/if}
  <button
    class="close"
    type="button"
    aria-label={t('common.close')}
    onclick={() => toast.dismiss(item.id)}
  >
    <Icon name="x" size={14} />
  </button>
</div>

<style>
  .toast {
    display: flex;
    align-items: flex-start;
    gap: var(--spacing-xs);
    width: 100%;
    max-width: 360px;
    padding: var(--spacing-sm) var(--spacing-md);
    border: 1px solid var(--color-rule);
    border-radius: var(--radius-panel);
    background: var(--color-paper);
    box-shadow: var(--shadow-dialog);
    font-size: var(--text-sm);
    color: var(--color-ink-2);
    pointer-events: auto;
    animation: toast-in var(--dur-short) var(--ease-out);
  }
  @keyframes toast-in {
    from {
      opacity: 0;
      transform: translateY(6px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  .ic {
    flex: none;
    color: var(--color-muted);
  }
  .toast.error .ic {
    color: var(--color-error);
  }
  .toast.success .ic {
    color: var(--color-matched);
  }
  .msg {
    flex: 1;
    line-height: var(--leading-ui);
  }
  .action {
    flex: none;
    padding: 0;
    border: 0;
    background: none;
    color: var(--color-accent);
    font-size: var(--text-sm);
    font-weight: 500;
    white-space: nowrap;
  }
  .action:hover {
    color: var(--color-accent-hover);
  }
  .close {
    flex: none;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    padding: 0;
    border: 0;
    border-radius: var(--radius-control);
    background: none;
    color: var(--color-muted);
  }
  .close:hover {
    background: var(--color-paper-2);
  }
  .action:focus-visible,
  .close:focus-visible {
    outline: 2px solid var(--color-focus);
    outline-offset: 2px;
  }
</style>
