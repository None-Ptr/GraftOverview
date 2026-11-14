<script lang="ts">
  import IconButton from '../common/IconButton.svelte';
  import Icon from '../common/Icon.svelte';
  import CompareButton from '../suggestions/CompareButton.svelte';
  import { t } from '$lib/i18n';
  import { theme } from '$lib/state/theme.svelte';
  import { ui } from '$lib/state/ui.svelte';
  import { workspaceStore } from '$lib/state/workspace.svelte';

  interface Props {
    title?: string;
    savedAt?: string | null;
  }

  let { title, savedAt }: Props = $props();

  let displayTitle = $derived(title ?? workspaceStore.map.title);
  let savedTime = $derived(
    savedAt ? new Date(savedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '',
  );

  function toggleTheme(): void {
    theme.set(theme.resolved === 'dark' ? 'light' : 'dark');
  }
</script>

<header class="topbar">
  <div class="brand">
    <!-- Sprout: solid leaf = mastered, dashed leaf = gap. -->
    <svg
      class="mark"
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden="true"
    >
      <g transform="translate(9.9 12.9) scale(1.25) translate(-9.9 -12.9)">
        <path
          d="M10 17.2V8.6"
          stroke="currentColor"
          stroke-width="1.6"
          stroke-linecap="round"
        />
        <path d="M10 14.2C8.71 12.05 6.85 11.25 4.4 11.8C5.69 13.95 7.55 14.75 10 14.2Z" fill="currentColor" />
        <path
          d="M10 11.9C11.29 9.93 13.09 9.17 15.4 9.6C14.11 11.57 12.31 12.33 10 11.9Z"
          stroke="currentColor"
          stroke-width="1.2"
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-dasharray="1.8 1.25"
        />
      </g>
    </svg>
    <span class="wordmark"><strong>Graft</strong><span>Overview</span></span>
  </div>

  <span class="divider"></span>

  <button
    class="doc-title"
    type="button"
    title={t('workspace.manage')}
    aria-label={`${displayTitle} · ${t('workspace.switch')}`}
    onclick={() => (ui.workspacesOpen = true)}
  >
    <span class="doc-title-text">{displayTitle}</span>
    <Icon name="chevron" size={14} />
  </button>
  {#if savedTime}
    <span class="saved tabular"><i></i>{t('common.savedAt', { time: savedTime })}</span>
  {/if}

  <div class="right">
    <IconButton icon="search" label={t('common.search')} onclick={() => (ui.searchOpen = true)} />
    <span class="desktop-only">
      <IconButton
        icon={theme.resolved === 'dark' ? 'sun' : 'moon'}
        label={t('common.theme')}
        onclick={toggleTheme}
      />
      <IconButton icon="sliders" label={t('common.settings')} onclick={() => (ui.settingsOpen = true)} />
      <IconButton icon="download" label={t('common.export')} onclick={() => (ui.exportOpen = true)} />
      <IconButton icon="link" label={t('share.title')} onclick={() => (ui.shareOpen = true)} />
    </span>
    <CompareButton />
    <span class="mobile-only">
      <IconButton icon="file" label={t('workspace.switch')} onclick={() => (ui.workspacesOpen = true)} />
      <IconButton icon="panel" label={t('common.panel')} onclick={() => (ui.panelOpen = !ui.panelOpen)} />
    </span>
  </div>
</header>

<style>
  .topbar {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    flex: none;
    height: 56px;
    padding: 0 16px;
    border-bottom: 1px solid var(--color-rule);
    background: var(--color-paper);
  }
  .brand {
    display: flex;
    align-items: center;
    gap: 6px;
    flex: none;
  }
  .mark {
    color: var(--color-accent);
  }
  .wordmark {
    display: flex;
    align-items: baseline;
    gap: 2px;
    font-family: var(--font-display);
    font-size: var(--text-md);
    letter-spacing: -0.02em;
    white-space: nowrap;
  }
  .wordmark strong {
    font-weight: 700;
    color: var(--color-ink);
  }
  .wordmark span {
    font-weight: 500;
    color: var(--color-muted);
  }
  .divider {
    width: 1px;
    height: 20px;
    background: var(--color-rule);
  }
  .doc-title {
    display: inline-flex;
    align-items: center;
    gap: var(--spacing-2xs);
    max-width: 24ch;
    min-width: 0;
    padding: var(--spacing-2xs) var(--spacing-xs);
    border: 0;
    border-radius: var(--radius-control);
    background: none;
    color: var(--color-ink-2);
    font-size: var(--text-sm);
    font-weight: 500;
    text-align: left;
  }
  .doc-title:hover {
    background: var(--color-paper-2);
  }
  .doc-title:focus-visible {
    outline: 2px solid var(--color-focus);
    outline-offset: 2px;
  }
  .doc-title-text {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .doc-title :global(svg) {
    flex: none;
    color: var(--color-muted);
  }
  .saved {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    flex: none;
    font-family: var(--font-mono);
    font-size: var(--text-2xs);
    letter-spacing: 0.06em;
    color: var(--color-muted);
  }
  .saved i {
    width: 5px;
    height: 5px;
    border-radius: var(--radius-pill);
    background: var(--color-matched);
  }
  .right {
    display: flex;
    align-items: center;
    gap: var(--spacing-2xs);
    margin-left: auto;
  }
  .desktop-only,
  .mobile-only {
    display: flex;
    align-items: center;
    gap: var(--spacing-2xs);
  }
  .mobile-only {
    display: none;
  }

  @media (max-width: 960px) {
    .doc-title,
    .saved,
    .divider {
      display: none;
    }
    /* The panel becomes a drawer at 960px, so the toggle must appear here. */
    .mobile-only {
      display: flex;
    }
  }
  @media (max-width: 640px) {
    .topbar {
      height: 48px;
      padding: 0 12px;
    }
    .desktop-only {
      display: none;
    }
    .wordmark span {
      display: none;
    }
  }
</style>
