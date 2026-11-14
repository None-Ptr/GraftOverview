<script lang="ts">
  import { toast } from '$lib/state/toast.svelte';
  import Toast from './Toast.svelte';
</script>

<div class="stack" aria-live="polite">
  {#each toast.items as item (item.id)}
    <Toast {item} />
  {/each}
</div>

<style>
  .stack {
    position: fixed;
    right: var(--spacing-md);
    bottom: var(--spacing-md);
    z-index: var(--z-toast);
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: var(--spacing-xs);
  }
  @media (max-width: 640px) {
    .stack {
      right: var(--spacing-xs);
      left: var(--spacing-xs);
      bottom: var(--spacing-xs);
      align-items: stretch;
    }
  }
</style>
