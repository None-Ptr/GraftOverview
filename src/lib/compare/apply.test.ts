import { describe, expect, it } from 'vitest';
import type { GapSuggestion, KnowledgeMap, TargetSystem } from '$lib/types';
import { applyGapToMap, buildGhostTrees } from './apply';
import { ghostId } from '$lib/locate';

const target: TargetSystem = {
  id: 't',
  title: '目标',
  updatedAt: '2026-01-01T00:00:00.000Z',
  source: 'template',
  root: {
    id: 't_root',
    topic: '根',
    children: [
      {
        id: 't_a',
        topic: '工程化',
        note: '说明',
        children: [
          { id: 't_a1', topic: 'Vite', children: [] },
          { id: 't_a2', topic: 'CI', children: [] },
        ],
      },
      { id: 't_b', topic: '性能', children: [] },
    ],
  },
};

const map: KnowledgeMap = {
  id: 'm',
  title: '我的',
  updatedAt: '2026-01-01T00:00:00.000Z',
  root: {
    id: 'u_root',
    topic: '我的知识',
    children: [{ id: 'u_html', topic: 'HTML', children: [] }],
  },
};

function gap(overrides: Partial<GapSuggestion>): GapSuggestion {
  return {
    signature: 'sig-a',
    targetId: 't_a',
    suggestedParentId: 'u_root',
    topic: '工程化',
    reason: 'r',
    selfCheck: [],
    links: [],
    priority: 'high',
    nodeCount: 3,
    status: 'pending',
    ...overrides,
  };
}

describe('buildGhostTrees', () => {
  it('includes only high-priority, pending, non-ignored gaps', () => {
    const trees = buildGhostTrees(
      target,
      [
        gap({ signature: 'ok', targetId: 't_a', priority: 'high' }),
        gap({ signature: 'medium', targetId: 't_b', priority: 'medium' }),
        gap({ signature: 'ignored', targetId: 't_b' }),
        gap({ signature: 'adopted', targetId: 't_b', status: 'adopted' }),
      ],
      ['ignored'],
    );
    expect(trees).toHaveLength(1);
    expect(trees[0].signature).toBe('ok');
    expect(trees[0].root.id).toBe(ghostId('t_a'));
    expect(trees[0].root.children[0].id).toBe(ghostId('t_a1'));
    expect(trees[0].priority).toBe('high');
  });

  it('returns nothing without a target', () => {
    expect(buildGhostTrees(null, [gap({})], [])).toEqual([]);
  });
});

describe('applyGapToMap', () => {
  it('deep-clones the subtree with fresh ids under the suggested parent', () => {
    const next = applyGapToMap(map, gap({ suggestedParentId: 'u_html' }), target, []);
    const html = next.root.children.find((n) => n.id === 'u_html')!;
    const inserted = html.children[0];
    expect(inserted.topic).toBe('工程化');
    expect(inserted.id).not.toBe('t_a');
    expect(inserted.note).toBe('说明');
    expect(inserted.children.map((n) => n.topic)).toEqual(['Vite', 'CI']);
    expect(inserted.children[0].id).not.toBe('t_a1');
  });

  it('skips already-matched descendants', () => {
    const next = applyGapToMap(map, gap({}), target, [
      { targetId: 't_a1', userNodeId: 'u_html', confidence: 0.9 },
    ]);
    const inserted = next.root.children.find((n) => n.topic === '工程化');
    expect(inserted!.children.map((n) => n.topic)).toEqual(['CI']);
  });

  it('attaches to root when the parent is null or unknown', () => {
    const next = applyGapToMap(map, gap({ suggestedParentId: null }), target, []);
    expect(next.root.children.some((n) => n.topic === '工程化')).toBe(true);

    const next2 = applyGapToMap(map, gap({ suggestedParentId: 'nope' }), target, []);
    expect(next2.root.children.some((n) => n.topic === '工程化')).toBe(true);
  });

  it('does not mutate the input map', () => {
    const snapshot = JSON.stringify(map);
    applyGapToMap(map, gap({}), target, []);
    expect(JSON.stringify(map)).toBe(snapshot);
  });
});
