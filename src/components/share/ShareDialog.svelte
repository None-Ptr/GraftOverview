<script lang="ts">
  import Dialog from '$lib/components/common/Dialog.svelte';
  import Button from '$lib/components/common/Button.svelte';
  import { t } from '$lib/i18n';
  import { workspaceStore } from '$lib/state/workspace.svelte';
  import { toast } from '$lib/state/toast.svelte';
  import { SHARE_LIMIT, buildSharePayload, encodeShare, shareUrl } from '$lib/share/encode';
  import { buildMarkdownReport, downloadText, timestampStamp } from '$lib/export/markdown';
  import { serializeProject } from '$lib/export/json';

  interface Props {
    open?: boolean;
  }

  let { open = $bindable(false) }: Props = $props();

  let link = $state('');

  function generate(): void {
    const payload = buildSharePayload(workspaceStore.workspace);
    if (!payload) {
      toast.error(t('share.needTarget'));
      return;
    }
    const encoded = encodeShare(payload);
    if (encoded.length > SHARE_LIMIT) {
      toast.error(t('share.tooLongHint'));
      return;
    }
    link = shareUrl(encoded);
    toast.info(t('share.generated'));
  }

  async function copy(): Promise<void> {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      toast.info(t('share.copied'));
    } catch {
      downloadText(
        `graft-workspace-${timestampStamp()}.json`,
        serializeProject(workspaceStore.workspace),
        'application/json',
      );
      toast.info(t('share.tooLongHint'));
    }
  }

  function exportJson(): void {
    downloadText(
      `graft-workspace-${timestampStamp()}.json`,
      serializeProject(workspaceStore.workspace),
      'application/json',
    );
  }

  function exportMarkdown(): void {
    downloadText(
      `graft-report-${timestampStamp()}.md`,
      buildMarkdownReport(workspaceStore.workspace),
      'text/markdown',
    );
  }
</script>

<Dialog bind:open title={t('share.title')}>
  <div class="form">
    <p class="body">{t('share.body')}</p>
    {#if !workspaceStore.hasTarget}
      <p class="warn">{t('share.needTarget')}</p>
    {/if}
    <Button variant="primary" full disabled={!workspaceStore.hasTarget} onclick={generate}>
      {t('share.generate')}
    </Button>
    {#if link}
      <div class="link-row">
        <input class="link" type="text" readonly value={link} aria-label={t('share.copy')} />
        <Button variant="ghost" onclick={copy}>{t('common.copy')}</Button>
      </div>
    {/if}
    <div class="divider"></div>
    <Button variant="ghost" full onclick={exportMarkdown}>{t('history.export')}</Button>
    <Button variant="ghost" full onclick={exportJson}>{t('common.export')} JSON</Button>
  </div>
</Dialog>

<style>
  .form {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xs);
  }
  .body {
    margin: 0;
    font-size: var(--text-sm);
    line-height: var(--leading-body);
    color: var(--color-muted);
  }
  .warn {
    margin: 0;
    font-size: var(--text-xs);
    color: var(--color-gap-ink);
  }
  .link-row {
    display: flex;
    align-items: flex-end;
    gap: var(--spacing-xs);
  }
  .link {
    flex: 1;
    min-width: 0;
    height: 36px;
    padding: 0 10px;
    border: 1px solid var(--color-rule-2);
    border-radius: var(--radius-control);
    background: var(--color-paper-2);
    color: var(--color-muted);
    font-family: var(--font-mono);
    font-size: var(--text-xs);
  }
  .divider {
    height: 1px;
    margin: var(--spacing-xs) 0;
    background: var(--color-rule);
  }
</style>
