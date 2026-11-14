<script lang="ts">
  import Dialog from '$lib/components/common/Dialog.svelte';
  import Button from '$lib/components/common/Button.svelte';
  import { t } from '$lib/i18n';
  import { loadOnboarded, saveOnboarded } from '$lib/storage/consent';

  let open = $state(!loadOnboarded());

  function start(): void {
    saveOnboarded();
    open = false;
  }
</script>

<Dialog bind:open title={t('onboarding.title')}>
  <div class="body">
    <p>{t('onboarding.body')}</p>
    <ol class="steps">
      <li>{t('onboarding.step1')}</li>
      <li>{t('onboarding.step2')}</li>
      <li>{t('onboarding.step3')}</li>
    </ol>
  </div>
  {#snippet footer()}
    <Button variant="primary" onclick={start}>{t('onboarding.start')}</Button>
  {/snippet}
</Dialog>

<style>
  .body {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-sm);
  }
  p {
    margin: 0;
    font-size: var(--text-sm);
    line-height: var(--leading-body);
    color: var(--color-ink-2);
  }
  .steps {
    margin: 0;
    padding-left: var(--spacing-md);
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xs);
    font-size: var(--text-sm);
    line-height: var(--leading-body);
    color: var(--color-ink-2);
  }
</style>
