<script lang="ts">
  import type { Snippet } from 'svelte';
  import IconButton from './IconButton.svelte';
  import { t } from '$lib/i18n';

  interface Props {
    open?: boolean;
    title: string;
    onClose?: () => void;
    /** `wide` gives two-pane forms room to breathe. */
    size?: 'md' | 'wide';
    children?: Snippet;
    footer?: Snippet;
  }

  let { open = $bindable(false), title, onClose, size = 'md', children, footer }: Props = $props();

  let el: HTMLDialogElement;

  $effect(() => {
    if (!el) return;
    if (open && !el.open) el.showModal();
    else if (!open && el.open) el.close();
  });

  function close(): void {
    open = false;
    onClose?.();
  }

  function handleCancel(event: Event): void {
    event.preventDefault();
    close();
  }

  function handleClick(event: MouseEvent): void {
    if (event.target === el) close();
  }
</script>

<dialog
  bind:this={el}
  class="dlg {size}"
  aria-labelledby="graft-dialog-title"
  oncancel={handleCancel}
  onclick={handleClick}
>
  <div class="inner">
    <header>
      <h2 id="graft-dialog-title">{title}</h2>
      <IconButton icon="x" label={t('common.close')} onclick={close} />
    </header>
    <div class="body">
      {#if children}{@render children()}{/if}
    </div>
    {#if footer}<div class="footer">{@render footer()}</div>{/if}
  </div>
</dialog>

<style>
  .dlg {
    position: fixed;
    inset: 0;
    margin: auto;
    width: min(480px, calc(100vw - 32px));
    max-height: min(80dvh, 40rem);
    padding: 0;
    border: 1px solid var(--color-rule);
    border-radius: var(--radius-panel);
    background: var(--color-paper);
    color: var(--color-ink-2);
    box-shadow: var(--shadow-dialog);
  }
  .dlg.wide {
    width: min(760px, calc(100vw - 32px));
  }
  .dlg::backdrop {
    background: color-mix(in oklch, var(--color-ink) 30%, transparent);
  }
  .inner {
    display: flex;
    flex-direction: column;
    max-height: min(80dvh, 40rem);
  }
  header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--spacing-md);
    height: 48px;
    padding: 0 var(--spacing-md);
    border-bottom: 1px solid var(--color-rule);
  }
  h2 {
    margin: 0;
    font-family: var(--font-display);
    font-size: var(--text-md);
    font-weight: 600;
    letter-spacing: -0.02em;
    color: var(--color-ink);
  }
  .body {
    padding: var(--spacing-md);
    overflow: auto;
  }
  .footer {
    display: flex;
    flex-wrap: wrap;
    gap: var(--spacing-xs);
    justify-content: flex-end;
    padding: var(--spacing-md);
    border-top: 1px solid var(--color-rule);
  }
</style>
