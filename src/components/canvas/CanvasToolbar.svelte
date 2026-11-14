<script lang="ts">
  import { t } from '$lib/i18n';
  import { ui, type MapCommandKind } from '$lib/state/ui.svelte';
  import { editor } from '$lib/map/editor.svelte';
  import IconButton from '$lib/components/common/IconButton.svelte';

  interface Props {
    canUndo?: boolean;
    canRedo?: boolean;
    /** Overrides the default router (target-canvas mode). */
    onCommand?: (kind: MapCommandKind) => void;
  }

  let { canUndo, canRedo, onCommand }: Props = $props();
  let undoEnabled = $derived(canUndo ?? editor.canUndo);
  let redoEnabled = $derived(canRedo ?? editor.canRedo);

  function send(kind: MapCommandKind): void {
    if (onCommand) onCommand(kind);
    else ui.sendMapCommand(kind);
  }
</script>

<div class="toolbar" role="toolbar" aria-label={t('common.edit')}>
  <IconButton icon="plus" label={t('map.toolbar.addChild')} onclick={() => send('addChild')} />
  <IconButton icon="sibling" label={t('map.toolbar.addSibling')} onclick={() => send('addSibling')} />
  <span class="sep"></span>
  <IconButton
    icon="undo"
    label={t('map.toolbar.undo')}
    disabled={!undoEnabled}
    onclick={() => send('undo')}
  />
  <IconButton
    icon="redo"
    label={t('map.toolbar.redo')}
    disabled={!redoEnabled}
    onclick={() => send('redo')}
  />
  <span class="sep"></span>
  <IconButton icon="fit" label={t('map.toolbar.fit')} onclick={() => send('fit')} />
</div>

<style>
  .toolbar {
    display: flex;
    align-items: center;
    gap: 2px;
    padding: var(--spacing-2xs);
    border: 1px solid var(--color-rule);
    border-radius: var(--radius-control);
    background: var(--color-paper);
    box-shadow: var(--shadow-whisper);
  }
  .sep {
    width: 1px;
    height: 20px;
    margin: 0 2px;
    background: var(--color-rule);
  }
</style>
