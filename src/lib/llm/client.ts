import type { StoredLlmSettings } from '$lib/types';
import { httpErrorCode, isAbort, LlmError } from './errors';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatOptions {
  messages: ChatMessage[];
  signal?: AbortSignal;
  jsonMode?: boolean;
  maxTokens?: number;
  temperature?: number;
  timeoutMs?: number;
}

export interface ChatResult {
  content: string;
  finishReason: string;
}

export const DEFAULT_TIMEOUT_MS = 120_000;

interface CompletionResponse {
  choices?: {
    message?: { content?: unknown };
    finish_reason?: string;
  }[];
}

/**
 * Direct browser fetch against an OpenAI-compatible endpoint (§4.1).
 * No SDK, no backend, no automatic retry. Aborts propagate so callers can
 * distinguish user cancellation from a failure.
 */
export async function chatCompletion(
  settings: StoredLlmSettings,
  options: ChatOptions,
): Promise<ChatResult> {
  const {
    messages,
    signal,
    jsonMode = settings.jsonMode,
    maxTokens = settings.maxTokens,
    temperature = settings.temperature,
    timeoutMs = DEFAULT_TIMEOUT_MS,
  } = options;

  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);
  const relayAbort = (): void => controller.abort();
  signal?.addEventListener('abort', relayAbort, { once: true });

  const url = `${settings.baseUrl.replace(/\/+$/, '')}/chat/completions`;
  const body: Record<string, unknown> = {
    model: settings.model,
    messages,
    temperature,
    max_tokens: maxTokens,
  };
  if (jsonMode) body.response_format = { type: 'json_object' };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${settings.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!response.ok) throw new LlmError(httpErrorCode(response.status));

    let payload: unknown;
    try {
      payload = await response.json();
    } catch {
      throw new LlmError('parse');
    }
    const choice = (payload as CompletionResponse | null)?.choices?.[0];
    const content = choice?.message?.content;
    if (typeof content !== 'string') throw new LlmError('empty');
    const finishReason = choice?.finish_reason ?? '';
    if (finishReason === 'length') throw new LlmError('truncated');
    return { content, finishReason };
  } catch (error: unknown) {
    if (error instanceof LlmError) throw error;
    if (timedOut) throw new LlmError('timeout');
    if (signal?.aborted || isAbort(error)) {
      throw error instanceof DOMException ? error : new DOMException('Aborted', 'AbortError');
    }
    throw new LlmError('network');
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', relayAbort);
  }
}

/** Lightweight connectivity probe; throws LlmError on failure. */
export async function testConnection(
  settings: StoredLlmSettings,
  signal?: AbortSignal,
): Promise<void> {
  await chatCompletion(settings, {
    messages: [{ role: 'user', content: 'Reply with the single word ok.' }],
    jsonMode: false,
    maxTokens: 16,
    timeoutMs: 20_000,
    signal,
  });
}

export { LlmError } from './errors';
export type { ErrorCode } from './errors';
