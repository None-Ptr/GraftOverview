<script lang="ts">
  import { currentLocale, t } from '$lib/i18n';
  import { ui } from '$lib/state/ui.svelte';
  import { theme } from '$lib/state/theme.svelte';
  import { workspaceStore } from '$lib/state/workspace.svelte';
  import Dialog from '$lib/components/common/Dialog.svelte';
  import Icon from '$lib/components/common/Icon.svelte';
  import type { IconName } from '$lib/components/common/icons';

  interface Command {
    id: string;
    label: string;
    icon: IconName;
    run: () => void;
  }

  let query = $state('');
  let active = $state(0);
  let inputEl = $state<HTMLInputElement | null>(null);

  let commands = $derived<Command[]>([
    { id: 'addChild', label: t('map.toolbar.addChild'), icon: 'plus', run: () => ui.sendMapCommand('addChild') },
    { id: 'addSibling', label: t('map.toolbar.addSibling'), icon: 'sibling', run: () => ui.sendMapCommand('addSibling') },
    { id: 'undo', label: t('map.toolbar.undo'), icon: 'undo', run: () => ui.sendMapCommand('undo') },
    { id: 'redo', label: t('map.toolbar.redo'), icon: 'redo', run: () => ui.sendMapCommand('redo') },
    { id: 'fit', label: t('map.toolbar.fit'), icon: 'fit', run: () => ui.sendMapCommand('fit') },
    { id: 'search', label: t('map.search.title'), icon: 'search', run: () => (ui.searchOpen = true) },
    { id: 'settings', label: t('settings.title'), icon: 'sliders', run: () => (ui.settingsOpen = true) },
    { id: 'workspaces', label: t('workspace.manage'), icon: 'file', run: () => (ui.workspacesOpen = true) },
    { id: 'templates', label: t('target.pick.templates'), icon: 'target', run: () => (ui.targetPickerOpen = true) },
    { id: 'generate', label: t('target.generate.title'), icon: 'sparkles', run: () => (ui.targetGenerateOpen = true) },
    { id: 'outline', label: t('target.editor.title'), icon: 'file', run: () => (ui.outlineEditorOpen = true) },
    { id: 'compare', label: t('compare.button'), icon: 'arrow-right', run: () => ui.requestCompare() },
    { id: 'test', label: t('session.start'), icon: 'target', run: () => (ui.sessionStartOpen = true) },
    { id: 'export', label: t('common.export'), icon: 'download', run: () => (ui.exportOpen = true) },
    { id: 'share', label: t('share.title'), icon: 'link', run: () => (ui.shareOpen = true) },
    {
      id: 'theme',
      label: t('common.theme'),
      icon: theme.resolved === 'dark' ? 'sun' : 'moon',
      run: () => theme.set(theme.resolved === 'dark' ? 'light' : 'dark'),
    },
    {
      id: 'locale',
      label: t('common.language'),
      icon: 'info',
      run: () => workspaceStore.setLocale(currentLocale() === 'zh' ? 'en' : 'zh'),
    },
    { id: 'panel', label: t('common.panel'), icon: 'panel', run: () => (ui.panelOpen = !ui.panelOpen) },
  ]);

  let filtered = $derived.by(() => {
    const needle = query.trim().toLowerCase();
    return needle ? commands.filter((c) => c.label.toLowerCase().includes(needle)) : commands;
  });

  $effect(() => {
    if (ui.paletteOpen) {
      query = '';
      active = 0;
      requestAnimationFrame(() => inputEl?.focus());
    }
  });

  $effect(() => {
    if (filtered.length === 0) active = 0;
    else if (active >= filtered.length) active = filtered.length - 1;
  });

  function run(command: Command | undefined): void {
    if (!command) return;
    ui.paletteOpen = false;
    command.run();
  }

  function onkeydown(event: KeyboardEvent): void {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      active = filtered.length === 0 ? 0 : (active + 1) % filtered.length;
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      active = filtered.length === 0 ? 0 : (active - 1 + filtered.length) % filtered.length;
    } else if (event.key === 'Enter') {
      event.preventDefault();
      run(filtered[active]);
    }
  }
</script>

<Dialog bind:open={ui.paletteOpen} title={t('common.commands')}>
  <div class="input-row">
    <Icon name="search" size={16} />
    <input
      bind:this={inputEl}
      bind:value={query}
      type="text"
      placeholder={t('common.commandPlaceholder')}
      aria-label={t('common.commandPlaceholder')}
      oninput={() => (active = 0)}
      onkeydown={onkeydown}
    />
    <kbd>Esc</kbd>
  </div>
  <ul class="list">
    {#each filtered as command, i (command.id)}
      <li>
        <button
          type="button"
          class:active={i === active}
          onclick={() => run(command)}
          onmouseenter={() => (active = i)}
        >
          <Icon name={command.icon} size={16} />
          <span>{command.label}</span>
        </button>
      </li>
    {/each}
    {#if filtered.length === 0}
      <li class="empty">{t('common.noCommand')}</li>
    {/if}
  </ul>
</Dialog>

<style>
  .input-row {
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
    height: 40px;
    margin-bottom: var(--spacing-xs);
    padding: 0 var(--spacing-sm);
    border: 1px solid var(--color-rule-2);
    border-radius: var(--radius-control);
    color: var(--color-muted);
  }
  input {
    flex: 1;
    min-width: 0;
    border: 0;
    background: none;
    color: var(--color-ink-2);
    font-size: var(--text-base);
  }
  input:focus-visible {
    outline: none;
  }
  kbd {
    font-family: var(--font-mono);
    font-size: var(--text-2xs);
    color: var(--color-muted);
  }
  .list {
    max-height: 46dvh;
    margin: 0;
    padding: 0;
    list-style: none;
    overflow: auto;
  }
  button {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    width: 100%;
    min-height: 38px;
    padding: 0 var(--spacing-sm);
    border: 0;
    border-radius: var(--radius-control);
    background: none;
    color: var(--color-ink-2);
    font-size: var(--text-sm);
    text-align: left;
  }
  button.active,
  button:hover {
    background: var(--color-accent-surface);
    color: var(--color-ink);
  }
  button:focus-visible {
    outline: 2px solid var(--color-focus);
    outline-offset: -2px;
  }
  .empty {
    padding: var(--spacing-md);
    font-size: var(--text-sm);
    color: var(--color-muted);
    text-align: center;
  }
  @media (pointer: coarse) {
    button {
      min-height: 44px;
    }
  }
</style>
