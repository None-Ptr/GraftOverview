<script lang="ts">
  import { t } from '$lib/i18n';
</script>

<div class="closed">
  <span class="badge">{t('session.mode.test')}</span>
  <h3>{t('session.closed.title')}</h3>
  <p>{t('session.closed.body')}</p>
  <p class="hint">{t('session.closed.hint')}</p>
</div>

<style>
  .closed {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-sm);
    padding: var(--spacing-md) 0;
  }
  .badge {
    align-self: flex-start;
    padding: 2px 8px;
    border: 1px solid var(--color-accent);
    border-radius: var(--radius-pill);
    background: var(--color-accent-surface);
    font-size: var(--text-2xs);
    color: var(--color-ink-2);
  }
  h3 {
    margin: 0;
    font-family: var(--font-display);
    font-size: var(--text-md);
    font-weight: 600;
    color: var(--color-ink);
  }
  p {
    margin: 0;
    font-size: var(--text-sm);
    line-height: var(--leading-body);
    color: var(--color-ink-2);
  }
  .hint {
    font-size: var(--text-xs);
    color: var(--color-muted);
  }
</style>
