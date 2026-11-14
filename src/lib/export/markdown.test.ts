import { describe, expect, it } from 'vitest';
import type { ComparisonResult, Workspace } from '$lib/types';
import { buildHistoryReport, buildMarkdownReport, timestampStamp } from './markdown';

const comparison: ComparisonResult = {
  id: 'c',
  createdAt: '2026-01-01T00:00:00.000Z',
  mapSignature: 'm',
  targetSignature: 't',
  matches: [{ targetId: 't1', userNodeId: 'u1', confidence: 0.9 }],
  gaps: [
    {
      signature: 'sig-1',
      targetId: 't2',
      suggestedParentId: null,
      topic: '工程化',
      reason: '缺少构建到发布的链路。',
      selfCheck: ['能配置生产构建吗？'],
      links: [{ title: 'Vite', url: 'https://vite.dev/guide/' }],
      priority: 'high',
      nodeCount: 3,
      status: 'pending',
    },
  ],
  extras: [{ userNodeId: 'u2', reason: '目标未覆盖可视化' }],
  stats: { targetNodes: 4, matchedNodes: 2, gapNodes: 2, coverage: 0.5 },
  model: { host: 'api.example.com', model: 'example' },
};

const workspace: Workspace = {
  schemaVersion: 1,
  map: {
    id: 'm',
    title: '我的导图',
    updatedAt: '2026-01-01T00:00:00.000Z',
    root: { id: 'u_root', topic: '我的', children: [] },
  },
  target: {
    id: 't',
    title: '前端体系',
    updatedAt: '2026-01-01T00:00:00.000Z',
    source: 'template',
    root: { id: 't_root', topic: '前端', children: [] },
  },
  comparison,
  ignoredSignatures: [],
  ui: { locale: 'zh', panelTab: 'suggestions' },
};

describe('markdown report', () => {
  it('includes title, coverage, gaps, self-checks and extras', () => {
    const report = buildMarkdownReport(workspace);
    expect(report).toContain('# 我的导图');
    expect(report).toContain('50%');
    expect(report).toContain('工程化');
    expect(report).toContain('缺少构建到发布的链路。');
    expect(report).toContain('https://vite.dev/guide/');
    expect(report).toContain('目标未覆盖可视化');
    expect(report).toContain('GraftOverview');
  });

  it('works from a history entry and marks ignored gaps', () => {
    const entry = {
      id: 'h',
      createdAt: '2026-01-01T00:00:00.000Z',
      targetTitle: '前端体系',
      mapTitle: '我的导图',
      stats: comparison.stats,
      result: { ...comparison, gaps: [{ ...comparison.gaps[0], status: 'ignored' as const }] },
    };
    const report = buildHistoryReport(entry);
    expect(report).toContain('已忽略');
    expect(report).not.toContain('apiKey');
  });

  it('produces deterministic timestamp names', () => {
    const stamp = timestampStamp(new Date(2026, 10, 13, 9, 5));
    expect(stamp).toBe('20261113-0905');
  });
});
