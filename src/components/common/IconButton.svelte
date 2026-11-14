<script lang="ts">
  import Icon from './Icon.svelte';
  import type { IconName } from './icons';

  interface Props {
    icon: IconName;
    label: string;
    title?: string;
    disabled?: boolean;
    active?: boolean;
    onclick?: (event: MouseEvent) => void;
  }

  let {
    icon,
    label,
    title,
    disabled = false,
    active = false,
    onclick,
  }: Props = $props();
</script>

<button
  type="button"
  class="iconbtn"
  class:active
  aria-label={label}
  aria-pressed={active ? 'true' : undefined}
  {title}
  {disabled}
  {onclick}
>
  <Icon name={icon} />
</button>

<style>
  .iconbtn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    padding: 0;
    border: 1px solid transparent;
    border-radius: var(--radius-control);
    background: transparent;
    color: var(--color-ink-2);
    transition:
      background-color var(--dur-micro) var(--ease-out),
      border-color var(--dur-micro) var(--ease-out),
      color var(--dur-micro) var(--ease-out);
  }
  @media (hover: hover) {
    .iconbtn:hover:not(:disabled) {
      background: var(--color-paper-2);
      border-color: var(--color-rule);
      color: var(--color-ink);
    }
  }
  .iconbtn:active:not(:disabled) {
    background: var(--color-paper-3);
  }
  .iconbtn.active {
    background: var(--color-accent-surface);
    color: var(--color-accent);
  }
  .iconbtn:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }
  .iconbtn:focus-visible {
    outline: 2px solid var(--color-focus);
    outline-offset: 2px;
  }
  @media (pointer: coarse) {
    .iconbtn {
      width: 44px;
      height: 44px;
    }
  }
</style>
