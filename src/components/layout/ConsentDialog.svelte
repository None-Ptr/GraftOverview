<script lang="ts">
  import Dialog from '../common/Dialog.svelte';
  import Button from '../common/Button.svelte';
  import { t } from '$lib/i18n';
  import { ui } from '$lib/state/ui.svelte';
  import { saveConsent } from '$lib/storage/consent';

  function confirm(): void {
    saveConsent(true);
    ui.consentOpen = false;
    ui.requestCompare();
  }
</script>

<Dialog bind:open={ui.consentOpen} title={t('compare.consent.title')}>
  <p class="body">{t('compare.consent.body')}</p>
  {#snippet footer()}
    <Button variant="ghost" onclick={() => (ui.consentOpen = false)}>{t('common.cancel')}</Button>
    <Button variant="primary" onclick={confirm}>{t('compare.consent.confirm')}</Button>
  {/snippet}
</Dialog>

<style>
  .body {
    margin: 0;
    max-width: 55ch;
    font-size: var(--text-sm);
    line-height: var(--leading-body);
    color: var(--color-ink-2);
  }
</style>
