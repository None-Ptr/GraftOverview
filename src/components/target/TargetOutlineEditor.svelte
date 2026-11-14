<script lang="ts">
  import { nanoid } from 'nanoid';
  import Dialog from '$lib/components/common/Dialog.svelte';
  import Button from '$lib/components/common/Button.svelte';
  import Input from '$lib/components/common/Input.svelte';
  import { t, type MessageKey } from '$lib/i18n';
  import { ui } from '$lib/state/ui.svelte';
  import { workspaceStore } from '$lib/state/workspace.svelte';
  import { toast } from '$lib/state/toast.svelte';
  import {
    parseOutline,
    serializeOutline,
    countNodes,
    maxDepth,
    type OutlineError,
  } from '$lib/target/outline';
  import type { KnowledgeNode, TargetSource, TargetSystem } from '$lib/types';

  interface Props {
    open?: boolean;
  }

  let { open = $bindable(false) }: Props = $props();

  const ERROR_KEYS: Record<string, MessageKey> = {
    'bad indent': 'target.editor.badIndent',
    'empty topic': 'target.editor.emptyTopic',
    'no root': 'target.editor.emptyTitle',
    'node limit exceeded': 'target.outline.nodeLimit',
  };

  let text = $state('');
  let title = $state('');
  let sourceMode = $state<TargetSource>('manual');
  let mobileTab = $state<'edit' | 'preview'>('edit');
  let wasOpen = false;
  let fileInput: HTMLInputElement;

  // Stable ids so the keyed preview does not churn on every keystroke.
  const idFactory = (index: number): string => `draft-${index}`;
  let parsed = $derived(parseOutline(text, { idFactory }));
  let nodeCount = $derived(parsed.root ? countNodes(parsed.root) : 0);
  let depth = $derived(parsed.root ? maxDepth(parsed.root) : 0);

  function messageFor(error: OutlineError): string {
    return t('target.editor.error', {
      line: error.line,
      message: t(ERROR_KEYS[error.message] ?? 'errors.generic'),
    });
  }

  function prefill(): void {
    const draft = ui.outlineDraft;
    const current = workspaceStore.target;
    if (draft) {
      text = serializeOutline(draft.root);
      title = draft.title;
      sourceMode = draft.source;
    } else if (current) {
      text = serializeOutline(current.root);
      title = current.title;
      sourceMode = current.source === 'manual' || current.source === 'imported' ? current.source : 'manual';
    } else {
      text = '';
      title = '';
      sourceMode = 'manual';
    }
    mobileTab = 'edit';
  }

  $effect(() => {
    if (open && !wasOpen) prefill();
    wasOpen = open;
  });

  function save(): void {
    const result = parseOutline(text, { idFactory });
    if (!result.root || result.errors.length > 0) return;
    const resolvedTitle = (title.trim() || result.root.topic).slice(0, 60);
    const draft = ui.outlineDraft;
    const system: TargetSystem = {
      id: draft?.id ?? nanoid(10),
      title: resolvedTitle,
      updatedAt: new Date().toISOString(),
      root: result.root,
      source: draft?.source ?? sourceMode,
      templateId: draft?.templateId,
      goal: draft?.goal,
    };
    workspaceStore.setTarget(system);
    ui.outlineDraft = null;
    ui.setPanelTab('target');
    toast.info(t('target.import.success'));
    open = false;
  }

  async function importFile(event: Event): Promise<void> {
    const input = event.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    text = await file.text();
    sourceMode = 'imported';
    ui.outlineDraft = null;
    if (!title.trim()) title = file.name.replace(/\.(md|txt|markdown)$/i, '').slice(0, 60);
    input.value = '';
  }
</script>

{#snippet branch(node: KnowledgeNode, depthLevel: number)}
  <div class="preview-row" style:padding-left={`${depthLevel * 12}px`}>
    <span class="dot"></span>
    <span class="preview-topic">{node.topic}</span>
    {#if node.note}<span class="preview-note">{node.note}</span>{/if}
  </div>
  {#each node.children as child (child.id)}
    {@render branch(child, depthLevel + 1)}
  {/each}
{/snippet}

<Dialog bind:open title={t('target.editor.title')} size="wide">
  <div class="editor">
    <div class="top">
      <Input label={t('target.titleLabel')} bind:value={title} />
      <span class="stats tabular">
        {t('target.template.nodes', { count: nodeCount })} · {t('target.outline.depth', { count: depth })}
      </span>
    </div>

    <div class="mobile-tabs">
      <Button variant={mobileTab === 'edit' ? 'primary' : 'ghost'} onclick={() => (mobileTab = 'edit')}>
        {t('target.editor.edit')}
      </Button>
      <Button variant={mobileTab === 'preview' ? 'primary' : 'ghost'} onclick={() => (mobileTab = 'preview')}>
        {t('target.editor.preview')}
      </Button>
    </div>

    <div class="split" class:show-edit={mobileTab === 'edit'} class:show-preview={mobileTab === 'preview'}>
      <div class="pane edit-pane">
        <textarea
          class="outline-input"
          spellcheck="false"
          aria-label={t('target.editor.title')}
          placeholder={t('target.editor.placeholder')}
          bind:value={text}
        ></textarea>
        {#if parsed.errors.length > 0}
          <ul class="errors">
            {#each parsed.errors as err, i (`${err.line}-${i}`)}
              <li>{messageFor(err)}</li>
            {/each}
          </ul>
        {/if}
      </div>
      <div class="pane preview-pane">
        {#if parsed.root}
          <div class="preview">{@render branch(parsed.root, 0)}</div>
        {:else}
          <p class="placeholder">{t('target.editor.emptyTitle')}</p>
        {/if}
      </div>
    </div>
  </div>

  {#snippet footer()}
    <div class="footer">
      <input
        bind:this={fileInput}
        class="file-input"
        type="file"
        accept=".md,.txt,.markdown,text/plain,text/markdown"
        aria-label={t('target.editor.import')}
        onchange={importFile}
      />
      <Button variant="ghost" onclick={() => fileInput?.click()}>{t('target.editor.import')}</Button>
      <span class="hint">{t('target.editor.importHint')}</span>
      <span class="spacer"></span>
      <Button variant="ghost" onclick={() => (open = false)}>{t('common.cancel')}</Button>
      <Button
        variant="primary"
        disabled={!parsed.root || parsed.errors.length > 0 || nodeCount > 100}
        onclick={save}
      >
        {t('target.editor.save')}
      </Button>
    </div>
  {/snippet}
</Dialog>

<style>
  .editor {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-sm);
  }
  .top {
    display: flex;
    align-items: flex-end;
    gap: var(--spacing-md);
  }
  .top :global(.field) {
    flex: 1;
  }
  .stats {
    flex: none;
    padding-bottom: 8px;
    font-family: var(--font-mono);
    font-size: var(--text-2xs);
    color: var(--color-muted);
  }
  .mobile-tabs {
    display: none;
    gap: var(--spacing-xs);
  }
  .split {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--spacing-sm);
    min-height: 320px;
  }
  .pane {
    display: flex;
    flex-direction: column;
    min-height: 0;
    border: 1px solid var(--color-rule-2);
    border-radius: var(--radius-control);
    background: var(--color-paper);
  }
  .outline-input {
    flex: 1;
    width: 100%;
    min-height: 320px;
    padding: var(--spacing-xs);
    border: 0;
    background: transparent;
    color: var(--color-ink-2);
    font-family: var(--font-mono);
    font-size: var(--text-sm);
    line-height: 1.7;
    resize: vertical;
  }
  .outline-input:focus-visible {
    outline: 2px solid var(--color-focus);
    outline-offset: -2px;
  }
  .errors {
    max-height: 100px;
    overflow: auto;
    margin: 0;
    padding: var(--spacing-2xs) var(--spacing-sm);
    border-top: 1px solid var(--color-error);
    font-size: var(--text-xs);
    color: var(--color-error);
  }
  .preview-pane {
    overflow: auto;
    max-height: 440px;
  }
  .preview {
    padding: var(--spacing-xs) 0;
  }
  .preview-row {
    display: flex;
    align-items: baseline;
    gap: var(--spacing-xs);
    min-height: 26px;
    padding-right: var(--spacing-xs);
    font-size: var(--text-sm);
  }
  .dot {
    width: 5px;
    height: 5px;
    flex: none;
    border-radius: var(--radius-pill);
    background: var(--color-neutral);
  }
  .preview-topic {
    color: var(--color-ink);
  }
  .preview-note {
    overflow: hidden;
    font-size: var(--text-2xs);
    color: var(--color-muted);
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .placeholder {
    padding: var(--spacing-md);
    font-size: var(--text-sm);
    color: var(--color-muted);
  }
  .footer {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--spacing-xs);
    width: 100%;
  }
  .file-input {
    display: none;
  }
  .hint {
    font-size: var(--text-2xs);
    color: var(--color-muted);
  }
  .spacer {
    flex: 1;
  }

  @media (max-width: 720px) {
    .mobile-tabs {
      display: flex;
    }
    .split {
      grid-template-columns: 1fr;
      min-height: 260px;
    }
    .split.show-edit .preview-pane {
      display: none;
    }
    .split.show-preview .edit-pane {
      display: none;
    }
    .hint {
      display: none;
    }
  }
</style>
