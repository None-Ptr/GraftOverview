import { describe, expect, it } from 'vitest';
import type { KnowledgeMap, TargetSystem } from '$lib/types';
import { targetAsDraftMap } from './draft';

const target: TargetSystem = {
  id: 't',
  title: '算法与数据结构',
  updatedAt: '2026-01-01T00:00:00.000Z',
  source: 'template',
  root: {
    id: 't_root',
    topic: '算法与数据结构',
    note: '能分析复杂度',
    children: [
      { id: 't_a', topic: '复杂度分析', note: '大 O', children: [{ id: 't_a1', topic: '摊还', children: [] }] },
    ],
  },
};

const base: KnowledgeMap = {
  id: 'map-1',
  title: '我的导图',
  updatedAt: '2026-01-01T00:00:00.000Z',
  root: { id: 'u_root', topic: '我的知识', children: [] },
};

describe('targetAsDraftMap', () => {
  it('copies the whole target with fresh ids and notes', () => {
    const draft = targetAsDraftMap(target, base);
    expect(draft.id).toBe('map-1');
    expect(draft.title).toBe('算法与数据结构');
    expect(draft.root.topic).toBe('算法与数据结构');
    expect(draft.root.note).toBe('能分析复杂度');
    expect(draft.root.id).not.toBe('t_root');
    expect(draft.root.children[0].topic).toBe('复杂度分析');
    expect(draft.root.children[0].id).not.toBe('t_a');
    expect(draft.root.children[0].children[0].id).not.toBe('t_a1');
  });

  it('does not share mutable structure with the target', () => {
    const draft = targetAsDraftMap(target, base);
    draft.root.children[0].topic = '改动';
    expect(target.root.children[0].topic).toBe('复杂度分析');
  });

  it('works without a base map', () => {
    const draft = targetAsDraftMap(target);
    expect(draft.id.length).toBeGreaterThan(0);
    expect(draft.root.children).toHaveLength(1);
  });
});
