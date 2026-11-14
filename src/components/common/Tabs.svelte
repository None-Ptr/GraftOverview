<script module lang="ts">
  export interface TabItem {
    id: string;
    label: string;
  }
</script>

<script lang="ts">
  interface Props {
    tabs: TabItem[];
    active?: string;
    onchange?: (id: string) => void;
  }

  let { tabs, active = $bindable(tabs[0]?.id ?? ''), onchange }: Props = $props();
  let buttons: HTMLButtonElement[] = $state([]);

  function select(id: string): void {
    active = id;
    onchange?.(id);
  }

  function focusTab(index: number): void {
    const normalized = (index + tabs.length) % tabs.length;
    const tab = tabs[normalized];
    if (!tab) return;
    select(tab.id);
    buttons[normalized]?.focus();
  }

  function handleKeydown(event: KeyboardEvent): void {
    const index = tabs.findIndex((tab) => tab.id === active);
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      focusTab(index + 1);
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      focusTab(index - 1);
    } else if (event.key === 'Home') {
      event.preventDefault();
      focusTab(0);
    } else if (event.key === 'End') {
      event.preventDefault();
      focusTab(tabs.length - 1);
    }
  }
</script>

<div class="tabs" role="tablist" tabindex="-1" onkeydown={handleKeydown}>
  {#each tabs as tab, i (tab.id)}
    <button
      bind:this={buttons[i]}
      type="button"
      role="tab"
      id={`graft-tab-${tab.id}`}
      aria-selected={active === tab.id}
      tabindex={active === tab.id ? 0 : -1}
      class:active={active === tab.id}
      onclick={() => select(tab.id)}
    >
      {tab.label}
    </button>
  {/each}
</div>

<style>
  .tabs {
    display: flex;
    align-items: stretch;
    height: 48px;
  }
  button {
    flex: 1;
    min-width: 0;
    padding: 0 var(--spacing-xs);
    border: 0;
    border-bottom: 2px solid transparent;
    background: transparent;
    color: var(--color-muted);
    font-size: var(--text-sm);
    font-weight: 500;
    white-space: nowrap;
    transition:
      color var(--dur-micro) var(--ease-out),
      background-color var(--dur-micro) var(--ease-out);
  }
  @media (hover: hover) {
    button:hover:not(.active) {
      color: var(--color-ink);
      background: var(--color-paper-2);
    }
  }
  button:active {
    background: var(--color-paper-3);
  }
  button.active {
    color: var(--color-ink);
    border-bottom-color: var(--color-accent);
  }
  button:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }
  button:focus-visible {
    outline: 2px solid var(--color-focus);
    outline-offset: -2px;
  }
  @media (pointer: coarse) {
    button {
      min-height: 44px;
    }
  }
</style>
