/**
 * Dependency-free token estimate. Not a real tokenizer: CJK scripts cost about
 * one token per character, everything else about one token per 3.6 characters.
 * Deliberately slightly conservative so the UI never under-promises the cost.
 */
const CJK = /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uac00-\ud7af\uf900-\ufaff]/g;

const MESSAGE_OVERHEAD = 4;
const REPLY_PRIMING = 8;

export function estimateTokens(text: string): number {
  if (!text) return 0;
  const cjk = text.match(CJK)?.length ?? 0;
  const other = text.length - cjk;
  return Math.ceil(cjk * 1.05 + other / 3.6);
}

export interface PromptMessage {
  content: string;
}

/** Approximate prompt size for a chat request (messages + reply priming). */
export function estimateMessagesTokens(messages: PromptMessage[]): number {
  let total = REPLY_PRIMING;
  for (const message of messages) total += MESSAGE_OVERHEAD + estimateTokens(message.content);
  return total;
}

/** `840` -> "840", `1240` -> "1.2k", `12400` -> "12k". */
export function formatTokens(tokens: number): string {
  if (tokens < 1000) return String(tokens);
  if (tokens < 10_000) return `${(tokens / 1000).toFixed(1)}k`;
  return `${Math.round(tokens / 1000)}k`;
}
