import { describe, expect, it } from 'vitest';
import type { KnowledgeMap, KnowledgeNode, StoredLlmSettings, TargetSystem } from '$lib/types';
import { DEFAULT_LLM_SETTINGS } from '$lib/storage/llm';
import { CHUNK_THRESHOLD } from '$lib/compare/chunk';
import { estimateComparison, estimateGeneration, hostOf } from './estimate';

const settings: StoredLlmSettings = { ...DEFAULT_LLM_SETTINGS, apiKey: 'k' };

function node(id: string, topic: string, children: KnowledgeNode[] = [], note?: string): KnowledgeNode {
  return { id, topic, ...(note ? { note } : {}), children };
}

function mapWith(children: KnowledgeNode[]): KnowledgeMap {
  return {
    id: 'm',
    title: 'map',
    updatedAt: '2026-01-01T00:00:00.000Z',
    root: node('u_root', '我的知识', children),
  };
}

function targetWith(children: KnowledgeNode[]): TargetSystem {
  return {
    id: 't',
    title: 'target',
    updatedAt: '2026-01-01T00:00:00.000Z',
    source: 'template',
    root: node('t_root', '目标', children),
  };
}

const map = mapWith([node('u_a', 'HTML'), node('u_b', 'CSS')]);
const target = targetWith([
  node('t_a', 'HTML', [], '能写出语义化标签，理解可访问性'),
  node('t_b', 'CSS', [], '掌握盒模型与布局，能做响应式页面'),
  node('t_c', 'JavaScript', [], '理解事件循环与异步编程'),
]);

describe('estimateComparison', () => {
  it('matches one request and returns consistent totals', () => {
    const estimate = estimateComparison(map, target, settings, 'zh', null);
    expect(estimate.requests).toBe(1);
    expect(estimate.input).toBeGreaterThan(0);
    expect(estimate.output).toBeGreaterThan(0);
    expect(estimate.total).toBe(estimate.input + estimate.output);
  });

  it('drops target notes in compact mode', () => {
    const full = estimateComparison(map, target, settings, 'zh', null);
    const compact = estimateComparison(map, { ...target }, { ...settings, compactPrompt: true }, 'zh', null);
    expect(compact.input).toBeLessThan(full.input);
  });

  it('plans one request per top-level branch above the chunk threshold', () => {
    const branches = Array.from({ length: 3 }, (_, b) =>
      node(
        `t_b${b}`,
        `分支 ${b}`,
        Array.from({ length: Math.ceil(CHUNK_THRESHOLD / 2) }, (_, i) =>
          node(`t_b${b}_${i}`, `节点 ${i}`),
        ),
      ),
    );
    const big = targetWith(branches);
    const estimate = estimateComparison(map, big, settings, 'zh', null);
    expect(estimate.requests).toBe(3);
    expect(estimate.total).toBe(estimate.input + estimate.output);
  });

  it('honours an explicit scope', () => {
    const scoped = estimateComparison(map, target, settings, 'zh', 't_a');
    const whole = estimateComparison(map, target, settings, 'zh', null);
    expect(scoped.requests).toBe(1);
    expect(scoped.input).toBeLessThan(whole.input);
  });

  it('returns a zero estimate for an unknown scope', () => {
    const estimate = estimateComparison(map, target, settings, 'zh', 'missing');
    expect(estimate).toEqual({ requests: 0, input: 0, output: 0, total: 0 });
  });

  it('caps output by maxTokens', () => {
    const tiny = estimateComparison(map, target, { ...settings, maxTokens: 256 }, 'zh', null);
    expect(tiny.output).toBeLessThanOrEqual(256);
  });
});

describe('estimateGeneration', () => {
  it('estimates a single request with a positive total', () => {
    const estimate = estimateGeneration(
      { domain: '前端', goal: '系统学习', level: 'beginner', weeklyHours: 6, locale: 'zh' },
      settings,
    );
    expect(estimate.requests).toBe(1);
    expect(estimate.input).toBeGreaterThan(0);
    expect(estimate.total).toBeGreaterThan(estimate.input);
  });
});

describe('hostOf', () => {
  it('extracts the host and tolerates garbage', () => {
    expect(hostOf('https://api.openai.com/v1')).toBe('api.openai.com');
    expect(hostOf('not a url')).toBe('unknown');
  });
});
