import { describe, expect, it } from 'vitest';
import { estimateMessagesTokens, estimateTokens, formatTokens } from './tokens';

describe('estimateTokens', () => {
  it('is zero for empty text', () => {
    expect(estimateTokens('')).toBe(0);
  });

  it('counts CJK near one token per character', () => {
    const text = '知识体系评估专家';
    const estimate = estimateTokens(text);
    expect(estimate).toBeGreaterThanOrEqual(text.length);
    expect(estimate).toBeLessThanOrEqual(text.length * 2);
  });

  it('counts latin at roughly four characters per token', () => {
    const text = 'knowledge graph comparison';
    const estimate = estimateTokens(text);
    expect(estimate).toBeGreaterThanOrEqual(5);
    expect(estimate).toBeLessThanOrEqual(12);
  });

  it('mixes both scripts', () => {
    const estimate = estimateTokens('比较 knowledge 与 graph');
    expect(estimate).toBeGreaterThan(estimateTokens('compare'));
  });

  it('adds per-message overhead and reply priming', () => {
    const single = estimateMessagesTokens([{ content: 'ok' }]);
    expect(single).toBeGreaterThan(estimateTokens('ok'));
    const two = estimateMessagesTokens([{ content: 'ok' }, { content: 'ok' }]);
    expect(two).toBeGreaterThan(single);
  });
});

describe('formatTokens', () => {
  it('keeps small numbers, shortens thousands', () => {
    expect(formatTokens(840)).toBe('840');
    expect(formatTokens(1240)).toBe('1.2k');
    expect(formatTokens(12_400)).toBe('12k');
  });
});
