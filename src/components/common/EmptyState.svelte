<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    title: string;
    body?: string;
    hint?: string;
    actions?: Snippet;
    compact?: boolean;
  }

  let { title, body, hint, actions, compact = false }: Props = $props();
</script>

<div class="empty" class:compact>
  <h2>{title}</h2>
  {#if body}<p class="body">{body}</p>{/if}
  {#if actions}<div class="actions">{@render actions()}</div>{/if}
  {#if hint}<p class="hint">{hint}</p>{/if}
</div>

<style>
  .empty {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: var(--spacing-md);
    max-width: 55ch;
  }
  h2 {
    margin: 0;
    font-family: var(--font-display);
    font-size: var(--text-2xl);
    font-weight: 600;
    line-height: var(--leading-display);
    letter-spacing: -0.03em;
    color: var(--color-ink);
  }
  .body {
    margin: 0;
    max-width: 55ch;
    font-size: var(--text-md);
    line-height: var(--leading-body);
    color: var(--color-ink-2);
  }
  .actions {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--spacing-sm);
  }
  .hint {
    margin: 0;
    font-family: var(--font-mono);
    font-size: var(--text-2xs);
    letter-spacing: 0.06em;
    color: var(--color-muted);
  }
  .compact h2 {
    font-size: var(--text-lg);
  }
  .compact .body {
    font-size: var(--text-sm);
  }
  .compact {
    gap: var(--spacing-sm);
  }
</style>
