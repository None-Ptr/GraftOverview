import { runComparison, LlmError } from '$lib/compare/run';
import { computeMastery } from './mastery';
import { hasApiKey, loadLlmSettings } from '$lib/storage/llm';
import { loadConsent } from '$lib/storage/consent';
import { workspaceStore } from '$lib/state/workspace.svelte';
import { ui } from '$lib/state/ui.svelte';
import { toast } from '$lib/state/toast.svelte';
import { errorMessageKey } from '$lib/llm/errors';
import { t } from '$lib/i18n';

/**
 * Lifecycle of a test session's one model call.
 * The attempt is locked before the request; a failure keeps it locked and
 * offers an explicit retry, so a session can never be edited after seeing
 * the verdict.
 */
class SessionController {
  submitting = $state(false);
  private controller: AbortController | null = null;

  async submit(): Promise<void> {
    const session = workspaceStore.session;
    if (!session || session.status !== 'active' || this.submitting) return;

    const settings = loadLlmSettings();
    if (!hasApiKey(settings)) {
      ui.settingsOpen = true;
      return;
    }
    if (!loadConsent()) {
      ui.consentOpen = true;
      return;
    }

    workspaceStore.lockSession();
    await this.compare();
  }

  async retry(): Promise<void> {
    const session = workspaceStore.session;
    if (!session || session.status !== 'locked' || this.submitting) return;
    await this.compare();
  }

  private async compare(): Promise<void> {
    const session = workspaceStore.session;
    if (!session) return;
    const settings = loadLlmSettings();
    const locale = workspaceStore.workspace.ui.locale;

    this.controller = new AbortController();
    this.submitting = true;
    try {
      const result = await runComparison(
        session.attempt,
        session.targetSnapshot,
        settings,
        locale,
        [],
        this.controller.signal,
      );
      const mastery = computeMastery(session, result, workspaceStore.map.root, locale);
      workspaceStore.completeSession(result, mastery);
      ui.sessionReviewOpen = true;
      toast.info(t('session.submitted'));
    } catch (error: unknown) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        toast.info(t('compare.canceled'));
        return;
      }
      const key = error instanceof LlmError ? errorMessageKey(error.code) : 'errors.generic';
      toast.error(t(key), {
        label: t('session.retry'),
        run: () => void this.retry(),
      });
    } finally {
      this.submitting = false;
      this.controller = null;
    }
  }

  cancel(): void {
    this.controller?.abort();
  }
}

export const sessionController = new SessionController();
