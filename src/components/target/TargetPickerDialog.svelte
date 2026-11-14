<script lang="ts">
  import Dialog from '$lib/components/common/Dialog.svelte';
  import Button from '$lib/components/common/Button.svelte';
  import Tag from '$lib/components/common/Tag.svelte';
  import { t, type MessageKey } from '$lib/i18n';
  import { ui } from '$lib/state/ui.svelte';
  import { workspaceStore } from '$lib/state/workspace.svelte';
  import { toast } from '$lib/state/toast.svelte';
  import { getCatalogTemplate, listCatalog } from '$lib/templates/catalog.svelte';
  import { parsePack } from '$lib/packs/schema';
  import { packStore } from '$lib/packs/store.svelte';
  import type { TemplatePack } from '$lib/packs/types';
  import { targetAsDraftMap } from '$lib/map/draft';

  interface Props {
    open?: boolean;
  }

  let { open = $bindable(false) }: Props = $props();

  let fileInput = $state<HTMLInputElement | null>(null);
  let pendingPack = $state<TemplatePack | null>(null);
  let importErrorKey = $state<MessageKey | null>(null);
  let importDetail = $state('');

  const ERROR_KEYS: Record<string, MessageKey> = {
    invalid: 'packs.err.invalid',
    future: 'packs.err.future',
    empty: 'packs.err.empty',
    tooMany: 'packs.err.tooMany',
    badTemplate: 'packs.err.badTemplate',
    tooSmall: 'packs.err.tooSmall',
    tooLarge: 'packs.err.tooLarge',
    badId: 'packs.err.badId',
    duplicateId: 'packs.err.duplicateId',
    noLicense: 'packs.err.noLicense',
  };

  let catalog = $derived(listCatalog());
  let builtins = $derived(catalog.filter((item) => item.source === 'builtin'));
  let community = $derived(catalog.filter((item) => item.source === 'community'));

  function choose(uid: string): void {
    const system = getCatalogTemplate(uid);
    if (!system) return;
    // Copy the target into the map as a first draft when asked, or when the
    // canvas is still empty (§2.4 "从目标生成初稿").
    const draft = ui.draftFromTargetIntent || workspaceStore.map.root.children.length === 0;
    workspaceStore.setTarget(system);
    if (draft) {
      workspaceStore.replaceMap(targetAsDraftMap(system, workspaceStore.map));
      ui.requestFit();
      toast.info(t('map.empty.draftCreated'));
    } else {
      toast.info(t('target.import.success'));
    }
    ui.draftFromTargetIntent = false;
    ui.setPanelTab('target');
    open = false;
  }

  function openOutline(): void {
    ui.outlineDraft = null;
    ui.draftFromTargetIntent = false;
    open = false;
    ui.outlineEditorOpen = true;
  }

  function openGenerate(): void {
    ui.draftFromTargetIntent = false;
    open = false;
    ui.targetGenerateOpen = true;
  }

  function cancelIntent(): void {
    ui.draftFromTargetIntent = false;
    pendingPack = null;
    importErrorKey = null;
  }

  async function importFile(event: Event): Promise<void> {
    const input = event.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    importErrorKey = null;
    importDetail = '';
    let parsed: unknown;
    try {
      parsed = JSON.parse(await file.text());
    } catch {
      importErrorKey = 'packs.err.invalid';
      return;
    }
    const result = parsePack(parsed);
    if (!result.ok) {
      importErrorKey = ERROR_KEYS[result.code] ?? 'packs.err.invalid';
      importDetail = result.detail ?? '';
      return;
    }
    pendingPack = result.pack;
  }

  function confirmImport(): void {
    if (!pendingPack) return;
    const stored = packStore.importPack(pendingPack);
    pendingPack = null;
    toast.info(t('packs.imported', { name: stored.name }));
  }

  function importMessage(): string {
    const code = importErrorKey;
    if (!code) return '';
    return t(code, importDetail ? { name: importDetail, id: importDetail } : undefined);
  }
</script>

<Dialog bind:open title={t('target.pick.title')} onClose={cancelIntent}>
  <p class="intro">{t('target.pick.description')}</p>

  {#if pendingPack}
    <div class="review" role="alertdialog">
      <p>
        {t('packs.reviewBody', {
          name: pendingPack.name,
          count: pendingPack.templates.length,
          author: pendingPack.author ?? t('packs.anonymous'),
          license: pendingPack.license,
        })}
      </p>
      <div class="actions">
        <Button variant="ghost" onclick={() => (pendingPack = null)}>{t('common.cancel')}</Button>
        <Button variant="primary" onclick={confirmImport}>{t('packs.confirm')}</Button>
      </div>
    </div>
  {:else}
    <div class="grid">
      {#each builtins as template (template.uid)}
        <button class="card" type="button" onclick={() => choose(template.uid)}>
          <span class="head">
            <span class="name">{template.title}</span>
            <Tag>{t('target.template.nodes', { count: template.nodeCount })}</Tag>
          </span>
          <span class="desc">{template.description}</span>
        </button>
      {/each}
    </div>

    <div class="community">
      <h3 class="section-title">
        <span>{t('packs.title')}</span>
        <Tag>{community.length}</Tag>
      </h3>
      {#if community.length === 0}
        <p class="hint">{t('packs.empty')}</p>
      {:else}
        <ul class="pack-list">
          {#each community as template (template.uid)}
            <li class="pack-row">
              <button type="button" class="pick" onclick={() => choose(template.uid)}>
                <span class="pack-name">{template.title}</span>
                <span class="pack-meta">
                  {template.packName} · {t('target.template.nodes', { count: template.nodeCount })}
                </span>
              </button>
              <Tag tone="accent">{t('packs.title')}</Tag>
            </li>
          {/each}
        </ul>
      {/if}
    </div>

    <div class="import">
      <input
        bind:this={fileInput}
        class="file-input"
        type="file"
        accept=".json,application/json"
        aria-label={t('packs.import')}
        onchange={importFile}
      />
      <Button variant="ghost" onclick={() => fileInput?.click()}>{t('packs.import')}</Button>
      <span class="hint">{t('packs.importHint')}</span>
    </div>
    {#if importErrorKey}
      <p class="error">{importMessage()}</p>
    {/if}

    <div class="row">
      <Button variant="ghost" onclick={openOutline}>{t('target.pick.blank')}</Button>
      <Button variant="ghost" onclick={openOutline}>{t('target.pick.import')}</Button>
      <Button variant="primary" onclick={openGenerate}>{t('target.pick.ai')}</Button>
    </div>
  {/if}
</Dialog>

<style>
  .intro {
    margin: 0 0 var(--spacing-md);
    font-size: var(--text-sm);
    line-height: var(--leading-body);
    color: var(--color-muted);
  }
  .grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: var(--spacing-sm);
    margin-bottom: var(--spacing-md);
  }
  .card {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-2xs);
    min-height: 88px;
    padding: var(--spacing-sm);
    border: 1px solid var(--color-rule-2);
    border-radius: var(--radius-panel);
    background: var(--color-paper);
    text-align: left;
    transition:
      border-color var(--dur-micro) var(--ease-out),
      background-color var(--dur-micro) var(--ease-out);
  }
  .card:hover {
    border-color: var(--color-accent);
    background: var(--color-accent-surface);
  }
  .card:active {
    background: var(--color-paper-2);
  }
  .card:focus-visible {
    outline: 2px solid var(--color-focus);
    outline-offset: 2px;
  }
  .head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--spacing-xs);
  }
  .name {
    font-family: var(--font-display);
    font-size: var(--text-sm);
    font-weight: 600;
    color: var(--color-ink);
  }
  .desc {
    font-size: var(--text-xs);
    line-height: var(--leading-ui);
    color: var(--color-muted);
  }
  .community {
    margin-bottom: var(--spacing-md);
  }
  .section-title {
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
    margin: 0 0 var(--spacing-xs);
    font-size: var(--text-xs);
    font-weight: 600;
    color: var(--color-muted);
  }
  .pack-list {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-2xs);
    margin: 0;
    padding: 0;
    list-style: none;
  }
  .pack-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--spacing-xs);
    padding: var(--spacing-2xs);
    border: 1px solid var(--color-rule);
    border-radius: var(--radius-control);
  }
  .pick {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 2px;
    flex: 1;
    min-width: 0;
    padding: 0;
    border: 0;
    background: none;
    text-align: left;
  }
  .pick:hover .pack-name {
    color: var(--color-accent-active);
  }
  .pick:focus-visible {
    outline: 2px solid var(--color-focus);
    outline-offset: 2px;
  }
  .pack-name {
    overflow: hidden;
    font-size: var(--text-sm);
    color: var(--color-ink);
    text-overflow: ellipsis;
    white-space: nowrap;
    max-width: 100%;
  }
  .pack-meta {
    font-family: var(--font-mono);
    font-size: var(--text-2xs);
    color: var(--color-muted);
  }
  .hint {
    margin: 0;
    font-size: var(--text-xs);
    color: var(--color-muted);
  }
  .import {
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
    margin-bottom: var(--spacing-md);
  }
  .file-input {
    display: none;
  }
  .error {
    margin: 0 0 var(--spacing-sm);
    font-size: var(--text-xs);
    color: var(--color-error);
  }
  .review {
    padding: var(--spacing-sm) var(--spacing-md);
    border: 1px solid var(--color-accent);
    border-radius: var(--radius-panel);
    background: var(--color-accent-surface);
  }
  .review p {
    margin: 0 0 var(--spacing-xs);
    font-size: var(--text-sm);
    color: var(--color-ink-2);
  }
  .actions {
    display: flex;
    justify-content: flex-end;
    gap: var(--spacing-xs);
  }
  .row {
    display: flex;
    flex-wrap: wrap;
    justify-content: flex-end;
    gap: var(--spacing-xs);
  }
  @media (max-width: 480px) {
    .grid {
      grid-template-columns: 1fr;
    }
  }
</style>
