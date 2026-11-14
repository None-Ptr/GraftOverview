import type { StoredLlmSettings } from '$lib/types';
import { loadLlmSettings, saveLlmSettings } from '$lib/storage/llm';

/** Reactive view of `graft.llm.v1`. Never part of the workspace. */
class LlmState {
  settings = $state<StoredLlmSettings>(loadLlmSettings());
  hasKey = $derived(this.settings.apiKey.trim().length > 0);

  reload(): void {
    this.settings = loadLlmSettings();
  }

  commit(next: StoredLlmSettings): void {
    saveLlmSettings(next);
    this.settings = next;
  }

  clearKey(): void {
    this.commit({ ...this.settings, apiKey: '' });
  }
}

export const llmState = new LlmState();
