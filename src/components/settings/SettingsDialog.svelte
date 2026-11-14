<script lang="ts">
  import Dialog from '$lib/components/common/Dialog.svelte';
  import Button from '$lib/components/common/Button.svelte';
  import IconButton from '$lib/components/common/IconButton.svelte';
  import Input from '$lib/components/common/Input.svelte';
  import Select from '$lib/components/common/Select.svelte';
  import { t, type MessageKey } from '$lib/i18n';
  import { llmState } from '$lib/state/llm.svelte';
  import { toast } from '$lib/state/toast.svelte';
  import { errorMessageKey, LlmError } from '$lib/llm/errors';
  import { testConnection } from '$lib/llm/client';
  import { estimateTestConnection } from '$lib/llm/estimate';
  import { formatTokens } from '$lib/llm/tokens';
  import { getPreset, PRESETS } from '$lib/llm/presets';
  import type { StoredLlmSettings } from '$lib/types';

  interface Props {
    open?: boolean;
  }

  let { open = $bindable(false) }: Props = $props();

  let presetId = $state('openai');
  let baseUrl = $state('');
  let model = $state('');
  let apiKey = $state('');
  let temperature = $state('0.2');
  let maxTokens = $state('4096');
  let jsonMode = $state(true);
  let compact = $state(false);
  let showKey = $state(false);
  let testing = $state(false);
  let error = $state('');
  let wasOpen = false;

  const presetOptions = $derived(
    PRESETS.map((preset) => ({ value: preset.id, label: t(preset.labelKey) })),
  );

  function prefill(): void {
    const s = llmState.settings;
    presetId = s.presetId;
    baseUrl = s.baseUrl;
    model = s.model;
    apiKey = s.apiKey;
    temperature = String(s.temperature);
    maxTokens = String(s.maxTokens);
    jsonMode = s.jsonMode;
    compact = s.compactPrompt === true;
    showKey = false;
    error = '';
    testing = false;
  }

  $effect(() => {
    if (open && !wasOpen) prefill();
    wasOpen = open;
  });

  function currentSettings(): StoredLlmSettings {
    const temp = Number(temperature);
    const tokens = Number(maxTokens);
    return {
      schemaVersion: 1,
      presetId,
      baseUrl: baseUrl.trim().replace(/\/+$/, ''),
      apiKey,
      model: model.trim(),
      temperature: Number.isFinite(temp) ? Math.min(1, Math.max(0, temp)) : 0.2,
      maxTokens: Number.isFinite(tokens) ? Math.min(8192, Math.max(256, Math.round(tokens))) : 4096,
      jsonMode,
      compactPrompt: compact,
    };
  }

  function applyPreset(id: string): void {
    presetId = id;
    const preset = getPreset(id);
    if (!preset) return;
    baseUrl = preset.baseUrl;
    model = preset.model;
    jsonMode = preset.jsonMode;
  }

  function save(): void {
    const next = currentSettings();
    if (!next.baseUrl || !next.model) {
      error = t('settings.invalid');
      return;
    }
    llmState.commit(next);
    toast.info(t('settings.saved'));
    open = false;
  }

  async function test(): Promise<void> {
    const next = currentSettings();
    if (!next.baseUrl || !next.model) {
      error = t('settings.invalid');
      return;
    }
    testing = true;
    error = '';
    try {
      await testConnection(next);
      toast.info(t('settings.testSuccess'));
    } catch (caught: unknown) {
      const key: MessageKey =
        caught instanceof LlmError ? errorMessageKey(caught.code) : 'errors.generic';
      toast.error(t(key));
    } finally {
      testing = false;
    }
  }

  function clearKey(): void {
    apiKey = '';
    llmState.clearKey();
    toast.info(t('settings.saved'));
  }
</script>

<Dialog bind:open title={t('settings.title')}>
  <div class="form">
    <Select
      label={t('settings.provider')}
      options={presetOptions}
      value={presetId}
      onchange={(event) => applyPreset((event.currentTarget as HTMLSelectElement).value)}
    />
    <Input label={t('settings.baseUrl')} bind:value={baseUrl} help={t('settings.baseUrlHint')} />
    <Input label={t('settings.model')} bind:value={model} help={t('settings.modelHint')} />

    <div class="key-row">
      <div class="key-input">
        <Input
          label={t('settings.apiKey')}
          type={showKey ? 'text' : 'password'}
          bind:value={apiKey}
        />
      </div>
      <IconButton
        icon={showKey ? 'eye-off' : 'eye'}
        label={showKey ? t('settings.hideKey') : t('settings.showKey')}
        onclick={() => (showKey = !showKey)}
      />
    </div>

    <div class="pair">
      <Input label={t('settings.temperature')} type="number" min={0} max={1} step={0.1} bind:value={temperature} />
      <Input label={t('settings.maxTokens')} type="number" min={256} max={8192} bind:value={maxTokens} />
    </div>

    <label class="check">
      <input type="checkbox" bind:checked={compact} />
      <span>{t('settings.compact')}</span>
      <small>{t('settings.compactHint')}</small>
    </label>

    <label class="check">
      <input type="checkbox" bind:checked={jsonMode} />
      <span>{t('settings.jsonModeLabel')}</span>
      <small>{t('settings.jsonModeHint')}</small>
    </label>

    {#if error}<p class="error">{error}</p>{/if}
    <p class="security">{t('settings.security')}</p>
  </div>

  {#snippet footer()}
    <div class="actions">
      <Button variant="ghost" onclick={clearKey}>{t('settings.clearKey')}</Button>
      <span class="spacer"></span>
      <span class="cost">{t('settings.testEstimate', { tokens: formatTokens(estimateTestConnection().total) })}</span>
      <Button variant="ghost" loading={testing} onclick={test}>{t('settings.test')}</Button>
      <Button variant="primary" onclick={save}>{t('settings.save')}</Button>
    </div>
  {/snippet}
</Dialog>

<style>
  .form {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-sm);
  }
  .key-row {
    display: flex;
    align-items: flex-end;
    gap: var(--spacing-xs);
  }
  .key-input {
    flex: 1;
    min-width: 0;
  }
  .pair {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--spacing-sm);
  }
  .check {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: var(--spacing-xs);
    font-size: var(--text-sm);
    color: var(--color-ink-2);
  }
  .check input {
    width: 16px;
    height: 16px;
    accent-color: var(--color-accent);
  }
  .check small {
    width: 100%;
    padding-left: 24px;
    font-size: var(--text-xs);
    color: var(--color-muted);
  }
  .security {
    margin: 0;
    font-size: var(--text-xs);
    line-height: var(--leading-ui);
    color: var(--color-muted);
  }
  .error {
    margin: 0;
    font-size: var(--text-xs);
    color: var(--color-error);
  }
  .actions {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--spacing-xs);
    width: 100%;
  }
  .spacer {
    flex: 1;
  }
  .cost {
    font-family: var(--font-mono);
    font-size: var(--text-2xs);
    letter-spacing: 0.04em;
    color: var(--color-muted);
    white-space: nowrap;
  }
</style>
