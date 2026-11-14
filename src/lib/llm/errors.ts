import type { MessageKey } from '$lib/i18n';

export type ErrorCode =
  | 'auth'
  | 'notFound'
  | 'rateLimit'
  | 'server'
  | 'network'
  | 'timeout'
  | 'parse'
  | 'truncated'
  | 'empty'
  | 'tooMany'
  | 'generic';

export class LlmError extends Error {
  constructor(
    public code: ErrorCode,
    message?: string,
  ) {
    super(message ?? code);
    this.name = 'LlmError';
  }
}

/** §4.6 — one user-facing message per failure class. */
export const ERROR_MESSAGE_KEYS: Record<ErrorCode, MessageKey> = {
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

export function errorMessageKey(code: ErrorCode): MessageKey {
  return ERROR_MESSAGE_KEYS[code];
}

export function httpErrorCode(status: number): ErrorCode {
  if (status === 401 || status === 403) return 'auth';
  if (status === 404) return 'notFound';
  if (status === 429) return 'rateLimit';
  if (status >= 500) return 'server';
  return 'generic';
}

export function isAbort(error: unknown): boolean {
  return (
    error instanceof DOMException &&
    (error.name === 'AbortError' || error.name === 'TimeoutError')
  );
}
