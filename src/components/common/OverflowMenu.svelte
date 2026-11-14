<script module lang="ts">
  export interface MenuItem {
    id: string;
    label: string;
    onselect: () => void;
    disabled?: boolean;
  }
</script>

<script lang="ts">
  import Icon from './Icon.svelte';

  interface Props {
    label: string;
    items: MenuItem[];
  }

  let { label, items }: Props = $props();

  let open = $state(false);
  let root = $state<HTMLDivElement | null>(null);
  let trigger = $state<HTMLButtonElement | null>(null);
  let itemEls = $state<HTMLButtonElement[]>([]);

  function toggle(): void {
    open = !open;
  }

  function close(focusTrigger = true): void {
    open = false;
    if (focusTrigger) trigger?.focus();
  }

  function choose(item: MenuItem): void {
    close();
    item.onselect();
  }

  function moveFocus(step: number): void {
    const usable = itemEls.filter((el) => !el.disabled);
    if (usable.length === 0) return;
    const current = usable.indexOf(document.activeElement as HTMLButtonElement);
    const next = usable[(current + step + usable.length) % usable.length];
    next?.focus();
  }

  $effect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent): void => {
      if (root && !root.contains(event.target as Node)) close(false);
    };
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        close();
      }
    };
    document.addEventListener('pointerdown', onPointerDown, true);
    document.addEventListener('keydown', onKey, true);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown, true);
      document.removeEventListener('keydown', onKey, true);
    };
  });

  // Move focus into the menu when it opens so keyboard users land on it.
  $effect(() => {
    if (open) itemEls[0]?.focus();
  });
</script>

<div class="menu" bind:this={root}>
  <button
    type="button"
    class="trigger"
    aria-label={label}
    aria-haspopup="menu"
    aria-expanded={open}
    onclick={toggle}
    bind:this={trigger}
  >
    <Icon name="more" />
  </button>

  {#if open}
    <div
      class="pop"
      role="menu"
      tabindex="-1"
      onkeydown={(event) => {
        if (event.key === 'ArrowDown') {
          event.preventDefault();
          moveFocus(1);
        } else if (event.key === 'ArrowUp') {
          event.preventDefault();
          moveFocus(-1);
        }
      }}
    >
      {#each items as item, index (item.id)}
        <button
          type="button"
          role="menuitem"
          class="item"
          disabled={item.disabled}
          onclick={() => choose(item)}
          bind:this={itemEls[index]}
        >
          {item.label}
        </button>
      {/each}
    </div>
  {/if}
</div>

<style>
  .menu {
    position: relative;
    display: inline-flex;
  }
  .trigger {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    padding: 0;
    border: 1px solid var(--color-rule);
    border-radius: var(--radius-control);
    background: var(--color-paper);
    color: var(--color-ink-2);
    transition:
      background-color var(--dur-micro) var(--ease-out),
      border-color var(--dur-micro) var(--ease-out);
  }
  .trigger:hover {
    border-color: var(--color-accent);
    background: var(--color-accent-surface);
  }
  .trigger:focus-visible {
    outline: 2px solid var(--color-focus);
    outline-offset: 2px;
  }
  .pop {
    position: absolute;
    top: calc(100% + 4px);
    right: 0;
    z-index: var(--z-dropdown);
    display: flex;
    flex-direction: column;
    min-width: 160px;
    padding: var(--spacing-2xs);
    border: 1px solid var(--color-rule);
    border-radius: var(--radius-panel);
    background: var(--color-paper);
    box-shadow: var(--shadow-dialog);
  }
  .item {
    padding: 0 var(--spacing-sm);
    border: 0;
    border-radius: var(--radius-control);
    background: transparent;
    color: var(--color-ink-2);
    font-size: var(--text-sm);
    text-align: left;
    white-space: nowrap;
    height: 32px;
  }
  .item:hover:not(:disabled) {
    background: var(--color-paper-2);
    color: var(--color-ink);
  }
  .item:focus-visible {
    outline: 2px solid var(--color-focus);
    outline-offset: -2px;
  }
  .item:disabled {
    color: var(--color-muted);
    cursor: not-allowed;
  }
  @media (pointer: coarse) {
    .item {
      height: 44px;
    }
  }
</style>
