<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    tone?: 'neutral' | 'gap' | 'matched' | 'accent';
    children: Snippet;
  }

  let { tone = 'neutral', children }: Props = $props();
</script>

<span class="tag {tone}">{@render children()}</span>

<style>
  .tag {
    display: inline-flex;
    align-items: center;
    height: 18px;
    padding: 0 var(--spacing-2xs);
    border: 1px solid var(--color-rule-2);
    border-radius: var(--radius-control);
    font-family: var(--font-mono);
    font-size: var(--text-2xs);
    letter-spacing: 0.06em;
    line-height: 1;
    white-space: nowrap;
    color: var(--color-muted);
  }
  .gap {
    border-color: var(--color-gap);
    background: var(--color-gap-surface);
    color: var(--color-gap-ink);
  }
  .matched {
    border-color: var(--color-matched);
    background: var(--color-matched-surface);
    color: var(--color-matched-ink);
  }
  .accent {
    border-color: var(--color-accent);
    background: var(--color-accent-surface);
    color: var(--color-accent-active);
  }
</style>
