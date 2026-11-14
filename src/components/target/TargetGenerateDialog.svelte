<script lang="ts">
  import Dialog from '$lib/components/common/Dialog.svelte';
  import Button from '$lib/components/common/Button.svelte';
  import Input from '$lib/components/common/Input.svelte';
  import Select from '$lib/components/common/Select.svelte';
  import Textarea from '$lib/components/common/Textarea.svelte';
  import { t, type MessageKey } from '$lib/i18n';
  import { ui } from '$lib/state/ui.svelte';
  import { llmState } from '$lib/state/llm.svelte';
  import { hasApiKey, loadLlmSettings } from '$lib/storage/llm';
  import { estimateGeneration } from '$lib/llm/estimate';
  import { formatTokens } from '$lib/llm/tokens';
  import { countNodes, maxDepth } from '$lib/target/outline';
  import { generateTarget, LlmError } from '$lib/compare/run';
  import { nanoid } from 'nanoid';
  import type { GoalSpec, Locale, TargetSystem } from '$lib/types';

  interface Props {
    open?: boolean;
  }

  let { open = $bindable(false) }: Props = $props();

  const ERROR_KEYS: Record<string, MessageKey> = {
    auth: 'errors.auth',
    notFound: 'errors.notFound',
    rateLimit: 'errors.rateLimit',
    server: 'errors.server',
    network: 'errors.network',
    timeout: 'errors.timeout',
    parse: 'errors.parse',
    truncated: 'errors.truncated',
    empty: 'errors.empty',
    tooMany: 'errors.tooMany',
    generic: 'errors.generic',
  };

  let domain = $state('');
  let goal = $state('');
  let level = $state('beginner');
  let horizon = $state('');
  let weeklyHours = $state('6');
  let locale = $state<Locale>('zh');
  let busy = $state(false);
  let error = $state('');
  let controller: AbortController | null = null;

  const levels = $derived([
    { value: 'beginner', label: t('target.level.beginner') },
    { value: 'intermediate', label: t('target.level.intermediate') },
    { value: 'advanced', label: t('target.level.advanced') },
  ]);
  const locales = $derived([
    { value: 'zh', label: t('common.zh') },
    { value: 'en', label: t('common.en') },
  ]);

  /** Mirrors the request `submit()` builds, so the price never surprises. */
  let estimate = $derived.by(() =>
    estimateGeneration(
      {
        domain: domain.trim().slice(0, 40),
        goal: goal.trim().slice(0, 200),
        level: level as GoalSpec['level'],
        horizon: horizon.trim() || undefined,
        weeklyHours: Number(weeklyHours) || 6,
        locale,
      },
      llmState.settings,
    ),
  );

  function reset(): void {
    domain = '';
    goal = '';
    level = 'beginner';
    horizon = '';
    weeklyHours = '6';
    locale = 'zh';
    error = '';
    busy = false;
    controller = null;
  }

  function validate(): string {
    if (!domain.trim()) return t('settings.invalid');
    if (!goal.trim()) return t('target.generate.goalPlaceholder');
    const hours = Number(weeklyHours);
    if (!Number.isFinite(hours) || hours < 1 || hours > 40) return t('target.generate.weeklyHours');
    return '';
  }

  async function submit(): Promise<void> {
    const problem = validate();
    if (problem) {
      error = problem;
      return;
    }
    const settings = loadLlmSettings();
    if (!hasApiKey(settings)) {
      error = t('settings.needKey');
      ui.settingsOpen = true;
      return;
    }

    busy = true;
    error = '';
    controller = new AbortController();
    const spec: GoalSpec = {
      domain: domain.trim().slice(0, 40),
      goal: goal.trim().slice(0, 200),
      level: level as GoalSpec['level'],
      horizon: horizon.trim() || undefined,
      weeklyHours: Number(weeklyHours),
      locale,
    };

    try {
      const generated = await generateTarget(spec, settings, controller.signal);
      const nodes = countNodes(generated.root);
      const depth = maxDepth(generated.root);
      if (nodes < 60 || nodes > 140 || depth > 4) {
        error = t('target.generate.tooLarge');
        return;
      }
      const draft: TargetSystem = {
        id: nanoid(10),
        title: generated.title.slice(0, 60),
        updatedAt: new Date().toISOString(),
        root: generated.root,
        source: 'generated',
        goal: spec,
      };
      // Preview before writing: the outline editor is the confirmation step.
      ui.outlineDraft = draft;
      open = false;
      ui.outlineEditorOpen = true;
      reset();
    } catch (caught: unknown) {
      if (caught instanceof DOMException && caught.name === 'AbortError') return;
      error = caught instanceof LlmError ? t(ERROR_KEYS[caught.code] ?? 'errors.generic') : t('target.generate.error');
    } finally {
      busy = false;
      controller = null;
    }
  }

  function cancel(): void {
    controller?.abort();
    busy = false;
    controller = null;
  }
</script>

<Dialog bind:open title={t('target.generate.title')} onClose={cancel}>
  <div class="form">
    <Input label={t('target.generate.domain')} placeholder={t('target.generate.domainPlaceholder')} bind:value={domain} />
    <Textarea label={t('target.generate.goal')} placeholder={t('target.generate.goalPlaceholder')} rows={3} bind:value={goal} />
    <Select label={t('target.generate.level')} options={levels} bind:value={level} />
    <Input label={t('target.generate.horizon')} placeholder={t('target.generate.horizonPlaceholder')} bind:value={horizon} />
    <Input label={t('target.generate.weeklyHours')} type="number" min={1} max={40} bind:value={weeklyHours} />
    <Select label={t('common.language')} options={locales} bind:value={locale} />
    {#if error}<p class="error">{error}</p>{/if}
  </div>

  {#snippet footer()}
    <p
      class="estimate"
      title={t('target.generate.estimate.title', {
        input: estimate.input,
        output: estimate.output,
      })}
    >
      {t('target.generate.estimate', {
        tokens: formatTokens(estimate.total),
        requests: estimate.requests,
      })}
    </p>
    <span class="spacer"></span>
    {#if busy}
      <Button variant="ghost" onclick={cancel}>{t('target.generate.cancel')}</Button>
    {:else}
      <Button variant="primary" onclick={submit}>{t('target.generate.submit')}</Button>
    {/if}
  {/snippet}
</Dialog>

<style>
  .form {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-sm);
  }
  .error {
    margin: 0;
    font-size: var(--text-xs);
    color: var(--color-error);
  }
  .estimate {
    margin: 0;
    font-family: var(--font-mono);
    font-size: var(--text-2xs);
    letter-spacing: 0.04em;
    color: var(--color-muted);
  }
  .spacer {
    flex: 1;
  }
</style>
