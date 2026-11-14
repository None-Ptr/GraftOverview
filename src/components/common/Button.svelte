<script lang="ts">
  import type { Snippet } from 'svelte';
  import Spinner from './Spinner.svelte';

  type Variant = 'primary' | 'ghost' | 'small' | 'icon';
  type Tone = 'default' | 'error' | 'success';

  interface Props {
    variant?: Variant;
    type?: 'button' | 'submit' | 'reset';
    disabled?: boolean;
    loading?: boolean;
    tone?: Tone;
    title?: string;
    ariaLabel?: string;
    full?: boolean;
    onclick?: (event: MouseEvent) => void;
    children?: Snippet;
  }

  let {
    variant = 'primary',
    type = 'button',
    disabled = false,
    loading = false,
    tone = 'default',
    title,
    ariaLabel,
    full = false,
    onclick,
    children,
  }: Props = $props();
</script>

<button
  {type}
  {title}
  aria-label={ariaLabel}
  aria-busy={loading}
  disabled={disabled || loading}
  class="btn {variant} {tone} {full ? 'full' : ''}"
  {onclick}
>
  {#if loading}<Spinner size={14} />{/if}
  {#if children}<span class="label">{@render children()}</span>{/if}
</button>

<style>
  .btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: var(--spacing-xs);
    height: 36px;
    padding: 0 var(--spacing-sm);
    border: 1px solid transparent;
    border-radius: var(--radius-control);
    background: transparent;
    color: var(--color-ink-2);
    font-size: var(--text-sm);
    font-weight: 500;
    line-height: 1;
    white-space: nowrap;
    transition:
      background-color var(--dur-micro) var(--ease-out),
      border-color var(--dur-micro) var(--ease-out),
      color var(--dur-micro) var(--ease-out),
      transform var(--dur-micro) var(--ease-out);
  }
  .btn:focus-visible {
    outline: 2px solid var(--color-focus);
    outline-offset: 2px;
  }
  .btn:disabled {
    cursor: not-allowed;
  }
  .btn:active:not(:disabled) {
    transform: translateY(1px);
  }
  .label {
    display: inline-flex;
    align-items: center;
    gap: var(--spacing-xs);
    min-width: 0;
    overflow: hidden;
  }
  /* Caller-rendered text spans truncate; block-level SVGs (icons) stay on the line. */
  .label > :global(span) {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .primary {
    background: var(--color-accent);
    color: var(--color-accent-ink);
  }
  @media (hover: hover) {
    .primary:hover:not(:disabled) {
      background: var(--color-accent-hover);
    }
  }
  .primary:active:not(:disabled) {
    background: var(--color-accent-active);
  }
  .primary:disabled {
    background: var(--color-paper-3);
    border-color: var(--color-rule-2);
    color: var(--color-muted);
  }
  .primary.error {
    border-color: var(--color-error);
  }
  .primary.success {
    background: var(--color-matched);
  }

  .ghost {
    border-color: var(--color-neutral);
    color: var(--color-ink-2);
  }
  @media (hover: hover) {
    .ghost:hover:not(:disabled) {
      background: var(--color-paper-2);
    }
  }
  .ghost:active:not(:disabled) {
    background: var(--color-paper-3);
  }
  .ghost:disabled {
    opacity: 0.55;
  }

  .small {
    height: 28px;
    padding: 0 var(--spacing-xs);
    font-size: var(--text-xs);
  }
  .icon {
    width: 36px;
    padding: 0;
  }
  .full {
    width: 100%;
  }

  @media (pointer: coarse) {
    .btn,
    .small {
      min-height: 44px;
    }
    .icon {
      width: 44px;
      height: 44px;
    }
  }
</style>
