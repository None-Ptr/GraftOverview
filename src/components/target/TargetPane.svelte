<script module lang="ts">
  import type { MessageKey } from '$lib/i18n';
  import type { TargetSource } from '$lib/types';

  const SOURCE_KEYS: Record<TargetSource, MessageKey> = {
    template: 'target.source.template',
    generated: 'target.source.generated',
    manual: 'target.source.manual',
    imported: 'target.source.imported',
  };
</script>

<script lang="ts">
  import type { KnowledgeNode, NodeId } from '$lib/types';
  import { workspaceStore } from '$lib/state/workspace.svelte';
  import { ui } from '$lib/state/ui.svelte';
  import { t } from '$lib/i18n';
  import { countNodes } from '$lib/target/outline';
  import EmptyState from '$lib/components/common/EmptyState.svelte';
  import Button from '$lib/components/common/Button.svelte';
  import Tag from '$lib/components/common/Tag.svelte';
  import OverflowMenu from '$lib/components/common/OverflowMenu.svelte';
  import TargetNoteField from './TargetNoteField.svelte';

  type MasteryView = 'mastered' | 'learning' | 'unset';

  let target = $derived(workspaceStore.target);
  let comparison = $derived(workspaceStore.comparison);
  let mastery = $derived(workspaceStore.mastery ?? {});
  let selectedId = $derived(ui.targetSelectedId);
  let gaps = $derived(comparison?.gaps ?? []);

  function findNode(root: KnowledgeNode, id: NodeId | null): KnowledgeNode | null {
    if (!id) return null;
    if (root.id === id) return root;
    for (const child of root.children) {
      const found = findNode(child, id);
      if (found) return found;
    }
    return null;
  }

  function masteryOf(id: NodeId): MasteryView {
    return mastery[id]?.state ?? 'unset';
  }

  function recordOf(id: NodeId) {
    return mastery[id] ?? null;
  }

  function gapFor(id: NodeId) {
    return gaps.find((g) => g.targetId === id);
  }

  /** Latest verdict is older than the target: results may no longer apply. */
  let masteryStale = $derived.by(() => {
    const records = Object.values(mastery);
    if (!target || records.length === 0) return false;
    const latest = Math.max(...records.map((record) => Date.parse(record.at)));
    return Date.parse(target.updatedAt) > latest + 1000;
  });

  const MASTERY_TONES = {
    mastered: 'matched',
    learning: 'gap',
    unset: 'neutral',
  } as const;

  const MASTERY_KEYS = {
    mastered: 'session.state.mastered',
    learning: 'session.state.learning',
    unset: 'session.state.unset',
  } as const;

  let selectedNode = $derived(target ? findNode(target.root, selectedId) : null);

  /** Timestamp of the most recent verdict, shown in the identity line. */
  let lastTestAt = $derived.by(() => {
    const records = Object.values(mastery);
    if (records.length === 0) return null;
    return records.reduce((latest, record) => (record.at > latest ? record.at : latest), records[0].at);
  });

  function select(node: KnowledgeNode): void {
    ui.targetSelectedId = node.id;
    if (ui.canvasMode === 'map') ui.requestLocate(node.id);
  }

  function saveNote(id: string, note: string): void {
    workspaceStore.setTargetNodeNote(id, note);
  }

  function formatAt(iso: string): string {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return iso;
    return date.toLocaleString(undefined, {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
</script>

{#snippet branch(node: KnowledgeNode, depth: number)}
  <div class="row">
    <button
      type="button"
      class="node"
      class:selected={selectedId === node.id}
      style:padding-left={`${8 + depth * 12}px`}
      onclick={() => select(node)}
    >
      <span class="dot m-{masteryOf(node.id)}"></span>
      <span class="topic" title={node.topic}>{node.topic}</span>
      {#if recordOf(node.id)?.confidence != null}
        <span class="conf tabular">{Math.round((recordOf(node.id)?.confidence ?? 0) * 100)}%</span>
      {/if}
    </button>
  </div>
  {#each node.children as child (child.id)}
    {@render branch(child, depth + 1)}
  {/each}
{/snippet}

{#if target}
  <div class="wrap">
    <div class="identity">
      <div class="identity-top">
        <input
          class="title-input"
          value={target.title}
          maxlength="60"
          aria-label={t('target.titleLabel')}
          oninput={(event) => {
            const value = (event.currentTarget as HTMLInputElement).value;
            if (value.trim()) workspaceStore.setTargetTitle(value);
          }}
        />
        <Tag tone="accent">{t(SOURCE_KEYS[target.source])}</Tag>
      </div>
      <p class="meta">
        <span class="tabular">{t('target.template.nodes', { count: countNodes(target.root) })}</span>
        {#if lastTestAt}
          <span class="sep">·</span>
          <span>{t('session.detail.metaShort', { time: formatAt(lastTestAt) })}</span>
        {/if}
      </p>
    </div>

    <div class="action-bar">
      <Button
        variant="primary"
        disabled={workspaceStore.sessionActive}
        onclick={() => (ui.sessionStartOpen = true)}
      >
        {t('session.start')}
      </Button>
      <Button
        variant="ghost"
        disabled={ui.canvasMode === 'target'}
        onclick={() => {
          ui.setPanelTab('target');
          ui.setCanvasMode('target');
        }}
      >
        {t('target.canvas.edit')}
      </Button>
      <span class="spacer"></span>
      <OverflowMenu
        label={t('common.more')}
        items={[
          { id: 'outline', label: t('target.edit'), onselect: () => (ui.outlineEditorOpen = true) },
          { id: 'pick', label: t('target.regenerate'), onselect: () => (ui.targetPickerOpen = true) },
        ]}
      />
    </div>

    {#if masteryStale}
      <p class="stale">{t('session.targetChanged')}</p>
    {/if}
    <div class="tree">{@render branch(target.root, 0)}</div>

    <div class="detail">
      {#if selectedNode}
        {@const state = masteryOf(selectedNode.id)}
        {@const record = recordOf(selectedNode.id)}
        {@const gap = gapFor(selectedNode.id)}
        <div class="detail-head">
          <span class="detail-title">{selectedNode.topic}</span>
          <Tag tone={MASTERY_TONES[state]}>{t(MASTERY_KEYS[state])}</Tag>
          {#if record?.confidence != null}
            <span class="conf tabular">{Math.round(record.confidence * 100)}%</span>
          {/if}
          <span class="spacer"></span>
          {#if ui.canvasMode === 'map'}
            <Button variant="small" onclick={() => ui.requestLocate(selectedNode!.id)}>
              {t('target.locate')}
            </Button>
          {/if}
        </div>
        <p class="detail-meta">
          {record
            ? t('session.detail.meta', { time: formatAt(record.at) })
            : t('session.detail.none')}
        </p>
        {#key selectedNode.id}
          <TargetNoteField
            id={selectedNode.id}
            note={selectedNode.note ?? ''}
            onsave={saveNote}
          />
        {/key}
        {#if gap}
          <p class="detail-note"><strong>{t('suggest.reason')}：</strong>{gap.reason}</p>
          {#if gap.selfCheck.length > 0}
            <p class="detail-label">{t('suggest.selfCheck')}</p>
            <ul class="checks">
              {#each gap.selfCheck as check, i (`${gap.signature}-${i}`)}
                <li>{check}</li>
              {/each}
            </ul>
          {/if}
          {#if gap.links.length > 0}
            <p class="detail-label">{t('suggest.links')} · <em>{t('suggest.unverifiedLinks')}</em></p>
            <ul class="links">
              {#each gap.links as link (link.url)}
                <li>
                  <a href={link.url} target="_blank" rel="noopener noreferrer">{link.title}</a>
                </li>
              {/each}
            </ul>
          {/if}
        {/if}
      {:else}
        <p class="hint">{t('target.pane.selectHint')}</p>
      {/if}
    </div>
  </div>
{:else}
  <EmptyState title={t('target.empty.title')} body={t('target.empty.body')} compact>
    {#snippet actions()}
      <Button variant="primary" onclick={() => (ui.targetPickerOpen = true)}>
        {t('target.pick.templates')}
      </Button>
      <Button variant="ghost" onclick={() => (ui.targetGenerateOpen = true)}>
        {t('target.pick.ai')}
      </Button>
      <Button variant="ghost" onclick={() => (ui.outlineEditorOpen = true)}>
        {t('target.pick.import')}
      </Button>
      <p class="hint">{t('target.empty.hint')}</p>
    {/snippet}
  </EmptyState>
{/if}

<style>
  .wrap {
    display: flex;
    flex-direction: column;
    padding-bottom: var(--spacing-3xl);
  }
  .identity {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-2xs);
    padding-bottom: var(--spacing-sm);
  }
  .identity-top {
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
  }
  .title-input {
    flex: 1;
    min-width: 0;
    height: 28px;
    margin-left: -6px;
    padding: 0 6px;
    border: 1px solid transparent;
    border-radius: var(--radius-control);
    background: transparent;
    color: var(--color-ink);
    font-family: var(--font-display);
    font-size: var(--text-md);
    font-weight: 600;
    letter-spacing: -0.02em;
    text-overflow: ellipsis;
  }
  .title-input:hover {
    border-color: var(--color-rule);
  }
  .title-input:focus-visible {
    outline: 2px solid var(--color-focus);
    outline-offset: 1px;
  }
  .meta {
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
    margin: 0;
    font-family: var(--font-mono);
    font-size: var(--text-2xs);
    letter-spacing: 0.04em;
    color: var(--color-muted);
  }
  .sep {
    color: var(--color-rule-2);
  }
  /* Primary actions live above the tree and stay reachable while scrolling. */
  .action-bar {
    position: sticky;
    top: 0;
    z-index: 2;
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
    margin: 0 calc(var(--spacing-md) * -1) var(--spacing-sm);
    padding: var(--spacing-2xs) var(--spacing-md);
    background: var(--color-paper);
    border-bottom: 1px solid var(--color-rule);
    /* Covers the strip between the panel edge and the pinned bar. */
    box-shadow: 0 calc(var(--spacing-md) * -1) 0 0 var(--color-paper);
  }
  .tree {
    display: flex;
    flex-direction: column;
    border-top: 1px solid var(--color-rule);
    border-bottom: 1px solid var(--color-rule);
    padding: var(--spacing-2xs) 0;
  }
  .node {
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
    width: 100%;
    min-height: 30px;
    padding-right: var(--spacing-xs);
    border: 0;
    background: none;
    text-align: left;
  }
  .node:hover {
    background: var(--color-paper-2);
  }
  .node.selected {
    background: var(--color-accent-surface);
  }
  .node:focus-visible {
    outline: 2px solid var(--color-focus);
    outline-offset: -2px;
  }
  .dot {
    width: 7px;
    height: 7px;
    flex: none;
    border-radius: var(--radius-pill);
    background: var(--color-neutral);
  }
  .dot.m-mastered {
    background: var(--color-accent);
  }
  .dot.m-learning {
    background: var(--color-gap);
  }
  .dot.m-unset {
    background: var(--color-rule-2);
  }
  .conf {
    flex: none;
    font-family: var(--font-mono);
    font-size: var(--text-2xs);
    color: var(--color-muted);
  }
  .detail-meta {
    margin: var(--spacing-2xs) 0 0;
    font-family: var(--font-mono);
    font-size: var(--text-2xs);
    color: var(--color-muted);
  }
  .stale {
    margin: 0 0 var(--spacing-sm);
    padding: var(--spacing-2xs) var(--spacing-sm);
    border: 1px solid var(--color-gap);
    border-radius: var(--radius-control);
    background: var(--color-gap-surface);
    color: var(--color-gap-ink);
    font-size: var(--text-xs);
  }
  .topic {
    overflow: hidden;
    font-size: var(--text-sm);
    text-overflow: ellipsis;
    white-space: nowrap;
    color: var(--color-ink-2);
  }
  .detail {
    position: sticky;
    bottom: 0;
    margin-top: var(--spacing-md);
    padding: var(--spacing-sm) var(--spacing-md);
    border: 1px solid var(--color-rule);
    border-radius: var(--radius-panel);
    background: var(--color-paper-2);
  }
  .detail-head {
    display: flex;
    align-items: center;
    justify-content: flex-start;
    gap: var(--spacing-xs);
  }
  .spacer {
    flex: 1;
  }
  .detail-label {
    margin: var(--spacing-xs) 0 var(--spacing-2xs);
    font-size: var(--text-2xs);
    font-weight: 600;
    color: var(--color-muted);
  }
  .detail-label em {
    font-style: normal;
    font-weight: 400;
  }
  .checks,
  .links {
    margin: 0;
    padding-left: var(--spacing-md);
    font-size: var(--text-xs);
    line-height: var(--leading-ui);
    color: var(--color-ink-2);
  }
  .links a {
    color: var(--color-accent-active);
    text-decoration: underline;
    text-underline-offset: 2px;
  }
  .detail-title {
    font-size: var(--text-sm);
    font-weight: 600;
    color: var(--color-ink);
  }
  .detail-note,
  .hint {
    margin: var(--spacing-2xs) 0 0;
    font-size: var(--text-xs);
    line-height: var(--leading-ui);
    color: var(--color-muted);
  }
  .detail-note strong {
    color: var(--color-ink-2);
  }
</style>
