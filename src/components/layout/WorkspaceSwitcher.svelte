<script lang="ts">
  import Dialog from '$lib/components/common/Dialog.svelte';
  import Button from '$lib/components/common/Button.svelte';
  import { t } from '$lib/i18n';
  import { workspaceStore } from '$lib/state/workspace.svelte';

  interface Props {
    open?: boolean;
  }

  let { open = $bindable(false) }: Props = $props();

  let renamingId = $state<string | null>(null);
  let renameValue = $state('');
  let deletingId = $state<string | null>(null);

  let items = $derived(workspaceStore.workspaces);
  let activeId = $derived(workspaceStore.activeId);

  function formatDate(iso: string): string {
    return new Date(iso).toLocaleString();
  }

  function select(id: string): void {
    if (id !== activeId) workspaceStore.switchTo(id);
    open = false;
  }

  function startRename(id: string, title: string): void {
    renamingId = id;
    deletingId = null;
    renameValue = title;
  }

  function commitRename(): void {
    if (!renamingId) return;
    workspaceStore.renameWorkspace(renamingId, renameValue);
    renamingId = null;
  }

  function create(): void {
    workspaceStore.createNew();
    open = false;
  }

  function doDelete(id: string): void {
    workspaceStore.deleteWorkspace(id);
    deletingId = null;
  }
</script>

<Dialog bind:open title={t('workspace.manage')}>
  <div class="form">
    <p class="count">{t('workspace.count', { count: items.length })}</p>

    <ul class="list">
      {#each items as item (item.id)}
        <li class="row" class:active={item.id === activeId}>
          {#if renamingId === item.id}
            <input
              class="rename"
              bind:value={renameValue}
              maxlength="60"
              aria-label={t('workspace.name')}
              onkeydown={(event) => {
                if (event.key === 'Enter') commitRename();
                if (event.key === 'Escape') renamingId = null;
              }}
            />
            <Button variant="small" onclick={commitRename}>{t('common.save')}</Button>
            <Button variant="small" onclick={() => (renamingId = null)}>{t('common.cancel')}</Button>
          {:else if deletingId === item.id}
            <span class="confirm">{t('workspace.deleteConfirm', { name: item.title })}</span>
            <Button variant="small" tone="error" onclick={() => doDelete(item.id)}>
              {t('workspace.delete')}
            </Button>
            <Button variant="small" onclick={() => (deletingId = null)}>{t('common.cancel')}</Button>
          {:else}
            <button type="button" class="pick" onclick={() => select(item.id)}>
              <span class="name">{item.title}</span>
              <span class="time">{t('workspace.updatedAt', { time: formatDate(item.updatedAt) })}</span>
              {#if item.id === activeId}
                <span class="badge">{t('workspace.current')}</span>
              {/if}
            </button>
            <div class="actions">
              <Button variant="small" onclick={() => startRename(item.id, item.title)}>
                {t('workspace.rename')}
              </Button>
              {#if items.length > 1}
                <Button variant="small" onclick={() => (deletingId = item.id)}>
                  {t('workspace.delete')}
                </Button>
              {/if}
            </div>
          {/if}
        </li>
      {/each}
    </ul>

    <Button variant="primary" full onclick={create}>{t('workspace.new')}</Button>
  </div>
</Dialog>

<style>
  .form {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-sm);
  }
  .count {
    margin: 0;
    font-family: var(--font-mono);
    font-size: var(--text-2xs);
    letter-spacing: 0.06em;
    color: var(--color-muted);
  }
  .list {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-2xs);
    max-height: 46dvh;
    margin: 0;
    padding: 0;
    list-style: none;
    overflow: auto;
  }
  .row {
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
    padding: var(--spacing-2xs);
    border: 1px solid var(--color-rule);
    border-radius: var(--radius-control);
    background: var(--color-paper);
  }
  .row.active {
    border-color: var(--color-accent);
    background: var(--color-accent-surface);
  }
  .pick {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 2px;
    flex: 1;
    min-width: 0;
    padding: var(--spacing-2xs);
    border: 0;
    background: none;
    text-align: left;
  }
  .pick:focus-visible {
    outline: 2px solid var(--color-focus);
    outline-offset: 2px;
  }
  .name {
    overflow: hidden;
    font-size: var(--text-sm);
    font-weight: 600;
    color: var(--color-ink);
    text-overflow: ellipsis;
    white-space: nowrap;
    max-width: 100%;
  }
  .time {
    font-family: var(--font-mono);
    font-size: var(--text-2xs);
    color: var(--color-muted);
  }
  .badge {
    font-family: var(--font-mono);
    font-size: var(--text-2xs);
    color: var(--color-accent-active);
  }
  .actions {
    display: flex;
    flex: none;
    gap: var(--spacing-2xs);
  }
  .rename {
    flex: 1;
    min-width: 0;
    height: 32px;
    padding: 0 8px;
    border: 1px solid var(--color-rule-2);
    border-radius: var(--radius-control);
    background: var(--color-paper);
    color: var(--color-ink);
    font-size: var(--text-sm);
  }
  .rename:focus-visible {
    outline: 2px solid var(--color-focus);
    outline-offset: 1px;
  }
  .confirm {
    flex: 1;
    min-width: 0;
    font-size: var(--text-xs);
    color: var(--color-error);
  }
  @media (pointer: coarse) {
    .pick {
      min-height: 44px;
    }
  }
</style>
