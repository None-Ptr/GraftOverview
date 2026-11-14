<script lang="ts">
  import Dialog from '$lib/components/common/Dialog.svelte';
  import Button from '$lib/components/common/Button.svelte';
  import { currentLocale, t } from '$lib/i18n';
  import { workspaceStore } from '$lib/state/workspace.svelte';
  import { toast } from '$lib/state/toast.svelte';
  import { buildMarkdownReport, downloadText, timestampStamp } from '$lib/export/markdown';
  import { parseProject, serializeProject } from '$lib/export/json';
  import { buildPackFromBuiltins, buildPackFromTarget, serializePack } from '$lib/packs/serialize';
  import type { Workspace } from '$lib/types';

  interface Props {
    open?: boolean;
  }

  let { open = $bindable(false) }: Props = $props();

  let fileInput = $state<HTMLInputElement | null>(null);
  let pendingImport = $state<Workspace | null>(null);
  let importError = $state('');

  function exportMarkdown(): void {
    downloadText(
      `graft-report-${timestampStamp()}.md`,
      buildMarkdownReport(workspaceStore.workspace),
      'text/markdown',
    );
    toast.info(t('history.exportDone'));
  }

  function exportJson(): void {
    downloadText(
      `graft-workspace-${timestampStamp()}.json`,
      serializeProject(workspaceStore.workspace),
      'application/json',
    );
    toast.info(t('history.exportDone'));
  }

  function exportTargetPack(): void {
    const target = workspaceStore.target;
    if (!target) {
      toast.error(t('packs.noTarget'));
      return;
    }
    downloadText(
      `graft-pack-${timestampStamp()}.json`,
      serializePack(buildPackFromTarget(target, currentLocale())),
      'application/json',
    );
    toast.info(t('packs.exported'));
  }

  function exportBuiltinPack(): void {
    downloadText(
      `graft-pack-${timestampStamp()}.json`,
      serializePack(buildPackFromBuiltins(currentLocale())),
      'application/json',
    );
    toast.info(t('packs.exported'));
  }

  async function importFile(event: Event): Promise<void> {
    const input = event.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    importError = '';
    const result = parseProject(await file.text());
    if (!result.ok) {
      importError =
        result.reason === 'future-version' ? t('common.dataFuture') : t('errors.importInvalid');
      return;
    }
    pendingImport = result.workspace;
  }

  function confirmImport(): void {
    if (!pendingImport) return;
    workspaceStore.importWorkspace(pendingImport);
    pendingImport = null;
    open = false;
    toast.info(t('share.importSuccess'));
  }
</script>

<Dialog bind:open title={t('common.export')}>
  <div class="form">
    {#if pendingImport}
      <div class="confirm" role="alertdialog">
        <p>{t('share.confirm')}</p>
        <div class="confirm-actions">
          <Button variant="ghost" onclick={() => (pendingImport = null)}>{t('common.cancel')}</Button>
          <Button variant="primary" onclick={confirmImport}>{t('share.confirmAction')}</Button>
        </div>
      </div>
    {:else}
      <Button variant="ghost" full onclick={exportMarkdown}>{t('history.export')} (Markdown)</Button>
      <Button variant="ghost" full onclick={exportJson}>{t('common.export')} (JSON)</Button>
      <Button
        variant="ghost"
        full
        disabled={!workspaceStore.hasTarget}
        onclick={exportTargetPack}
      >
        {t('packs.exportTarget')}
      </Button>
      <Button variant="ghost" full onclick={exportBuiltinPack}>{t('packs.exportBuiltin')}</Button>
      <div class="divider"></div>
      <input
        bind:this={fileInput}
        class="file-input"
        type="file"
        accept=".json,application/json"
        aria-label={t('common.import')}
        onchange={importFile}
      />
      <Button variant="ghost" full onclick={() => fileInput?.click()}>{t('common.import')} (JSON)</Button>
      {#if importError}<p class="error">{importError}</p>{/if}
    {/if}
  </div>
</Dialog>

<style>
  .form {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xs);
  }
  .divider {
    height: 1px;
    margin: var(--spacing-xs) 0;
    background: var(--color-rule);
  }
  .file-input {
    display: none;
  }
  .error {
    margin: 0;
    font-size: var(--text-xs);
    color: var(--color-error);
  }
  .confirm p {
    margin: 0 0 var(--spacing-xs);
    font-size: var(--text-sm);
    color: var(--color-ink-2);
  }
  .confirm-actions {
    display: flex;
    justify-content: flex-end;
    gap: var(--spacing-xs);
  }
</style>
