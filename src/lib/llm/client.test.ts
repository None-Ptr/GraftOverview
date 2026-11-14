import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { chatCompletion, testConnection } from './client';
import { LlmError } from './errors';
import { DEFAULT_LLM_SETTINGS } from '$lib/storage/llm';
import type { StoredLlmSettings } from '$lib/types';

const settings: StoredLlmSettings = { ...DEFAULT_LLM_SETTINGS, apiKey: 'sk-secret' };
const messages = [{ role: 'user' as const, content: 'hi' }];

function completion(content: string, finishReason = 'stop'): Response {
  return new Response(
    JSON.stringify({ choices: [{ message: { content }, finish_reason: finishReason }] }),
    { status: 200, headers: { 'Content-Type': 'application/json' } },
  );
}

beforeEach(() => {
  vi.useRealTimers();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('chatCompletion', () => {
  it('returns content and finish reason on a valid 200', async () => {
    const spy = vi.fn(async () => completion('{"ok":true}'));
    vi.stubGlobal('fetch', spy);
    const result = await chatCompletion(settings, { messages });
    expect(result).toEqual({ content: '{"ok":true}', finishReason: 'stop' });
    const [url, init] = spy.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://api.openai.com/v1/chat/completions');
    const body = JSON.parse(String(init.body)) as Record<string, unknown>;
    expect(body.model).toBe('gpt-4o-mini');
    expect(body.response_format).toEqual({ type: 'json_object' });
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer sk-secret');
  });

  it('omits response_format when jsonMode is false', async () => {
    const spy = vi.fn(async () => completion('ok'));
    vi.stubGlobal('fetch', spy);
    await chatCompletion(settings, { messages, jsonMode: false });
    const [, init] = spy.mock.calls[0] as unknown as [string, RequestInit];
    expect(JSON.parse(String(init.body))).not.toHaveProperty('response_format');
  });

  it('strips a trailing slash from baseUrl', async () => {
    const spy = vi.fn(async () => completion('ok'));
    vi.stubGlobal('fetch', spy);
    await chatCompletion({ ...settings, baseUrl: 'https://x.test/v1/' }, { messages });
    const call = spy.mock.calls[0] as unknown as [string, RequestInit];
    expect(call[0]).toBe('https://x.test/v1/chat/completions');
  });

  for (const [status, code] of [
    [401, 'auth'],
    [403, 'auth'],
    [404, 'notFound'],
    [429, 'rateLimit'],
    [500, 'server'],
  ] as const) {
    it(`maps HTTP ${status} to ${code}`, async () => {
      vi.stubGlobal('fetch', vi.fn(async () => new Response('', { status })));
      await expect(chatCompletion(settings, { messages })).rejects.toMatchObject({ code });
    });
  }

  it('maps a network TypeError to network', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('failed to fetch'); }));
    await expect(chatCompletion(settings, { messages })).rejects.toMatchObject({ code: 'network' });
  });

  it('maps invalid JSON body to parse', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('not json', { status: 200 })));
    await expect(chatCompletion(settings, { messages })).rejects.toMatchObject({ code: 'parse' });
  });

  it('maps missing content to empty', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ choices: [{}] }), { status: 200 })));
    await expect(chatCompletion(settings, { messages })).rejects.toMatchObject({ code: 'empty' });
  });

  it('treats finish_reason=length as truncated', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => completion('{"a":', 'length')));
    await expect(chatCompletion(settings, { messages })).rejects.toMatchObject({ code: 'truncated' });
  });

  it('maps a timeout to timeout', async () => {
    vi.useFakeTimers();
    vi.stubGlobal(
      'fetch',
      vi.fn(
        (_url: string, init: RequestInit) =>
          new Promise<Response>((_resolve, reject) => {
            init.signal?.addEventListener('abort', () =>
              reject(new DOMException('Aborted', 'AbortError')),
            );
          }),
      ),
    );
    const promise = chatCompletion(settings, { messages, timeoutMs: 1000 });
    const assertion = expect(promise).rejects.toMatchObject({ code: 'timeout' });
    await vi.advanceTimersByTimeAsync(1000);
    await assertion;
  });

  it('propagates user cancellation as an AbortError', async () => {
    const controller = new AbortController();
    vi.stubGlobal(
      'fetch',
      vi.fn(
        (_url: string, init: RequestInit) =>
          new Promise<Response>((_resolve, reject) => {
            init.signal?.addEventListener('abort', () =>
              reject(new DOMException('Aborted', 'AbortError')),
            );
          }),
      ),
    );
    const promise = chatCompletion(settings, { messages, signal: controller.signal });
    const assertion = expect(promise).rejects.toMatchObject({ name: 'AbortError' });
    controller.abort();
    await assertion;
  });

  it('never includes the key in an LlmError message', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('', { status: 401 })));
    const err = await chatCompletion(settings, { messages }).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(LlmError);
    expect(String(err)).not.toContain('sk-secret');
  });
});

describe('testConnection', () => {
  it('resolves on a valid response', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => completion('ok')));
    await expect(testConnection(settings)).resolves.toBeUndefined();
  });
});
