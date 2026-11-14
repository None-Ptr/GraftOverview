<script lang="ts">
  import Tabs from '../common/Tabs.svelte';
  import IconButton from '../common/IconButton.svelte';
  import TargetPane from '../target/TargetPane.svelte';
  import SuggestionsPane from '../suggestions/SuggestionsPane.svelte';
  import HistoryPane from '../history/HistoryPane.svelte';
  import SessionPane from '../session/SessionPane.svelte';
  import { t } from '$lib/i18n';
  import { ui } from '$lib/state/ui.svelte';
  import { workspaceStore } from '$lib/state/workspace.svelte';
  import type { PanelTab } from '$lib/types';

  let gapCount = $derived(workspaceStore.activeGaps.length);
  let closedBook = $derived(workspaceStore.session?.mode === 'test');
  let tabs = $derived([
    { id: 'target', label: t('target.tab') },
    { id: 'suggestions', label: `${t('suggest.tab')} ${gapCount}` },
    { id: 'history', label: t('history.tab') },
  ]);

  function changeTab(id: string): void {
    workspaceStore.setPanelTab(id as PanelTab);
  }
</script>

{#if ui.panelOpen}
  <button
    class="scrim"
    type="button"
    aria-label={t('common.close')}
    onclick={() => (ui.panelOpen = false)}
  ></button>
{/if}

<aside class="panel" class:open={ui.panelOpen} aria-label={t('common.panel')}>
  <div class="grabber"></div>
  <div class="head">
    {#if closedBook}
      <span class="closed-title">{t('session.mode.test')}</span>
    {:else}
      <Tabs {tabs} active={ui.panelTab} onchange={changeTab} />
    {/if}
    <div class="mobile-actions">
      <IconButton icon="sliders" label={t('common.settings')} onclick={() => (ui.settingsOpen = true)} />
      <IconButton icon="x" label={t('common.close')} onclick={() => (ui.panelOpen = false)} />
    </div>
  </div>
  <div class="content">
    {#if closedBook}
      <SessionPane />
    {:else if ui.panelTab === 'target'}
      <TargetPane />
    {:else if ui.panelTab === 'suggestions'}
      <SuggestionsPane />
    {:else}
      <HistoryPane />
    {/if}
  </div>
</aside>

<style>
  .panel {
    display: flex;
    flex-direction: column;
    flex: none;
    width: 360px;
    border-left: 1px solid var(--color-rule);
    background: var(--color-paper);
  }
  .head {
    display: flex;
    align-items: center;
    flex: none;
    height: 48px;
    border-bottom: 1px solid var(--color-rule);
  }
  .head :global(.tabs) {
    flex: 1;
  }
  .closed-title {
    flex: 1;
    padding: 0 var(--spacing-md);
    font-size: var(--text-sm);
    font-weight: 600;
    color: var(--color-ink-2);
  }
  .content {
    flex: 1;
    min-height: 0;
    overflow: auto;
    padding: var(--spacing-md);
  }
  .mobile-actions,
  .grabber {
    display: none;
  }
  .scrim {
    display: none;
  }

  @media (max-width: 960px) {
    .panel {
      position: fixed;
      top: 56px;
      right: 0;
      bottom: 0;
      z-index: var(--z-modal);
      width: min(360px, 92vw);
      box-shadow: var(--shadow-dialog);
      transform: translateX(100%);
      transition: transform var(--dur-long) var(--ease-out);
    }
    .panel.open {
      transform: translateX(0);
    }
    .mobile-actions {
      display: flex;
      align-items: center;
      gap: var(--spacing-2xs);
      padding-right: var(--spacing-xs);
    }
    .scrim {
      display: block;
      position: fixed;
      inset: 56px 0 0 0;
      z-index: calc(var(--z-modal) - 1);
      width: 100%;
      border: 0;
      background: color-mix(in oklch, var(--color-ink) 25%, transparent);
    }
  }

  @media (max-width: 640px) {
    .panel {
      top: auto;
      left: 0;
      right: 0;
      bottom: 0;
      width: 100%;
      height: 64dvh;
      border-left: 0;
      border-radius: var(--radius-sheet) var(--radius-sheet) 0 0;
      transform: translateY(100%);
    }
    .panel.open {
      transform: translateY(0);
    }
    .grabber {
      display: block;
      width: 36px;
      height: 4px;
      margin: var(--spacing-xs) auto 0;
      border-radius: var(--radius-pill);
      background: var(--color-rule-2);
    }
    .scrim {
      inset: 48px 0 0 0;
    }
  }
</style>
