<script lang="ts">
  import { onMount } from 'svelte';
  import type { KnowledgeMap, NodeId } from '$lib/types';
  import { currentRoute, onRouteChange, type Route } from '$lib/router';
  import { workspaceStore } from '$lib/state/workspace.svelte';
  import { ui } from '$lib/state/ui.svelte';
  import { theme } from '$lib/state/theme.svelte';
  import { locateInMap } from '$lib/locate';
  import { buildGhostTrees, adoptGap } from '$lib/compare/apply';
  import { targetAsDraftMap } from '$lib/map/draft';
  import { toast } from '$lib/state/toast.svelte';
  import { t } from '$lib/i18n';

  import TopBar from './components/layout/TopBar.svelte';
  import Panel from './components/layout/Panel.svelte';
  import CanvasShell from './components/layout/CanvasShell.svelte';
  import SearchPopover from './components/layout/SearchPopover.svelte';
  import CommandPalette from './components/layout/CommandPalette.svelte';
  import OnboardingDialog from './components/layout/OnboardingDialog.svelte';
  import WorkspaceSwitcher from './components/layout/WorkspaceSwitcher.svelte';
  import ConsentDialog from './components/layout/ConsentDialog.svelte';
  import DataRecovery from './components/layout/DataRecovery.svelte';
  import ToastStack from './components/common/ToastStack.svelte';
  import SettingsDialog from './components/settings/SettingsDialog.svelte';
  import TargetPickerDialog from './components/target/TargetPickerDialog.svelte';
  import TargetGenerateDialog from './components/target/TargetGenerateDialog.svelte';
  import TargetOutlineEditor from './components/target/TargetOutlineEditor.svelte';
  import SessionStartDialog from './components/session/SessionStartDialog.svelte';
  import SessionReviewDialog from './components/session/SessionReviewDialog.svelte';
  import SuggestionsPaneExportDialog from './components/suggestions/ExportDialog.svelte';
  import ScopePickerDialog from './components/suggestions/ScopePickerDialog.svelte';
  import ShareDialog from './components/share/ShareDialog.svelte';
  import SharePreview from './components/share/SharePreview.svelte';

  let route = $state<Route>(currentRoute());
  let selectedNodeId = $state<NodeId | null>(null);
  let workspaceLoaded = false;

  let ghostTrees = $derived(
    workspaceStore.sessionActive
      ? []
      : buildGhostTrees(
          workspaceStore.target,
          workspaceStore.comparison?.gaps ?? [],
          workspaceStore.ignoredSignatures,
        ),
  );

  let locateRequest = $derived.by(() => {
    const request = ui.locateRequest;
    if (!request) return null;
    const found = locateInMap(
      request.nodeId,
      workspaceStore.target,
      workspaceStore.map,
      workspaceStore.comparison,
      ghostTrees,
      workspaceStore.workspace.ui.locale,
    );
    return found ? { nodeId: found.nodeId, ts: request.ts } : null;
  });

  // Locating a node that has no counterpart must not feel broken.
  let lastMissedLocate = 0;
  $effect(() => {
    const request = ui.locateRequest;
    if (!request || request.ts === lastMissedLocate || locateRequest) return;
    lastMissedLocate = request.ts;
    toast.info(t('target.locate.missing'));
  });

  // Target editing only makes sense while a target exists and the workspace
  // has not changed underneath it.
  let lastActiveId = workspaceStore.activeId;
  $effect(() => {
    const id = workspaceStore.activeId;
    if (id !== lastActiveId) {
      lastActiveId = id;
      ui.setCanvasMode('map');
    }
    if (ui.canvasMode === 'target' && !workspaceStore.target) ui.setCanvasMode('map');
  });

  function ensureWorkspace(): void {
    if (workspaceLoaded) return;
    workspaceLoaded = true;
    workspaceStore.load();
  }

  onMount(() => {
    theme.init();
    // Read-only share pages never touch localStorage.
    if (route.kind === 'workspace') ensureWorkspace();

    const off = onRouteChange((next) => {
      route = next;
      if (next.kind === 'workspace') ensureWorkspace();
    });

    const onKey = (event: KeyboardEvent): void => {
      const mod = event.ctrlKey || event.metaKey;
      if (mod && event.key.toLowerCase() === 'f') {
        event.preventDefault();
        ui.searchOpen = true;
      } else if (mod && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        ui.paletteOpen = true;
      } else if (mod && event.key === 'Enter') {
        event.preventDefault();
        if (route.kind === 'workspace') ui.requestCompare();
      } else if (event.key === 'Escape') {
        ui.searchOpen = false;
        ui.settingsOpen = false;
        ui.targetPickerOpen = false;
        ui.targetGenerateOpen = false;
        ui.outlineEditorOpen = false;
        ui.exportOpen = false;
        ui.shareOpen = false;
        ui.consentOpen = false;
        ui.panelOpen = false;
        ui.paletteOpen = false;
        ui.scopePickerOpen = false;
        ui.workspacesOpen = false;
        ui.historyDetail = null;
        selectedNodeId = null;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      off();
      window.removeEventListener('keydown', onKey);
    };
  });

  function handleMapChange(map: KnowledgeMap): void {
    if (workspaceStore.sessionActive) workspaceStore.updateAttempt(map);
    else workspaceStore.replaceMap(map);
  }

  function handleSelect(nodeId: NodeId | null): void {
    selectedNodeId = nodeId;
  }

  function handleGhostAdopt(signature: string): void {
    adoptGap(signature);
  }

  function handleAction(action: 'generate' | 'blank' | 'import'): void {
    if (action === 'generate') {
      // §2.4: copy the target as a first draft; if there is no target yet, pick
      // one first and draft from the selection.
      if (workspaceStore.target) {
        workspaceStore.replaceMap(
          targetAsDraftMap(workspaceStore.target, workspaceStore.map),
        );
        ui.requestFit();
        toast.info(t('map.empty.draftCreated'));
      } else {
        ui.draftFromTargetIntent = true;
        ui.targetPickerOpen = true;
      }
    } else if (action === 'import') {
      ui.outlineEditorOpen = true;
    } else {
      ui.sendMapCommand('rename', workspaceStore.map.root.id);
    }
  }
</script>

{#if route.kind === 'share'}
  <SharePreview data={route.data} />
{:else if route.kind === 'share-invalid'}
  <SharePreview invalid={true} />
{:else if workspaceStore.dataError}
  <DataRecovery />
{:else}
  <div class="app">
    <TopBar savedAt={workspaceStore.savedAt} />
    <div class="body">
      <CanvasShell
        map={workspaceStore.activeMap}
        {ghostTrees}
        {selectedNodeId}
        {locateRequest}
        onMapChange={handleMapChange}
        onSelect={handleSelect}
        onGhostAdopt={handleGhostAdopt}
        onAction={handleAction}
      />
      <Panel />
    </div>
  </div>

  <SearchPopover />
  <CommandPalette />
  <OnboardingDialog />
  <WorkspaceSwitcher bind:open={ui.workspacesOpen} />
  <SettingsDialog bind:open={ui.settingsOpen} />
  <TargetPickerDialog bind:open={ui.targetPickerOpen} />
  <TargetGenerateDialog bind:open={ui.targetGenerateOpen} />
  <TargetOutlineEditor bind:open={ui.outlineEditorOpen} />
  <SessionStartDialog bind:open={ui.sessionStartOpen} />
  <SessionReviewDialog bind:open={ui.sessionReviewOpen} />
  <SuggestionsPaneExportDialog bind:open={ui.exportOpen} />
  <ScopePickerDialog bind:open={ui.scopePickerOpen} />
  <ShareDialog bind:open={ui.shareOpen} />
  <ConsentDialog />
{/if}

<ToastStack />

<style>
  .app {
    display: flex;
    flex-direction: column;
    height: 100dvh;
  }
  .body {
    display: flex;
    flex: 1;
    min-height: 0;
  }
</style>
