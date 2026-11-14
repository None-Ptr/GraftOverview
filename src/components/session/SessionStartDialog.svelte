<script lang="ts">
  import Dialog from '$lib/components/common/Dialog.svelte';
  import Button from '$lib/components/common/Button.svelte';
  import { t } from '$lib/i18n';
  import { workspaceStore } from '$lib/state/workspace.svelte';

  interface Props {
    open?: boolean;
  }

  let { open = $bindable(false) }: Props = $props();

  function start(mode: 'test' | 'practice'): void {
    workspaceStore.startSession(mode);
    open = false;
  }
</script>

<Dialog bind:open title={t('session.startTitle')}>
  <div class="form">
    <p class="body">{t('session.startBody')}</p>
    <Button variant="primary" full onclick={() => start('test')}>{t('session.mode.test')}</Button>
    <Button variant="ghost" full onclick={() => start('practice')}>{t('session.mode.practice')}</Button>
  </div>
</Dialog>

<style>
  .form {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-sm);
  }
  .body {
    margin: 0;
    font-size: var(--text-sm);
    line-height: var(--leading-body);
    color: var(--color-muted);
  }
</style>
