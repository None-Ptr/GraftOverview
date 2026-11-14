import { describe, expect, it } from 'vitest';
import {
  findNodeByTopic,
  ghostId,
  isGhostId,
  locateInMap,
  locateTarget,
  stripGhostPrefix,
} from './locate';
import type { ComparisonResult, GhostTree, KnowledgeMap, TargetSystem } from './types';

const comparison: ComparisonResult = {
  id: 'c1',
  createdAt: '2026-11-13T00:00:00.000Z',
  mapSignature: 'a',
  targetSignature: 'b',
  matches: [{ targetId: 't_html', userNodeId: 'u_html', confidence: 0.9 }],
  gaps: [],
  extras: [],
  stats: { targetNodes: 1, matchedNodes: 1, gapNodes: 0, coverage: 1 },
  model: { host: 'localhost', model: 'test' },
};

const ghostTrees: GhostTree[] = [
  {
    signature: 'sig-1',
    parentId: 'u_root',
    priority: 'high',
    root: { id: 'ghost-t_eng', topic: '工程化', children: [{ id: 'ghost-t_vite', topic: 'Vite', children: [] }] },
  },
];

describe('ghost ids', () => {
  it('prefixes, detects, and strips', () => {
    expect(ghostId('t_eng')).toBe('ghost-t_eng');
    expect(isGhostId('ghost-t_eng')).toBe(true);
    expect(isGhostId('t_eng')).toBe(false);
    expect(stripGhostPrefix('ghost-t_eng')).toBe('t_eng');
  });
});

describe('locateTarget', () => {
  it('prefers ghost nodes', () => {
    expect(locateTarget('t_eng', comparison, ghostTrees)).toEqual({
      nodeId: 'ghost-t_eng',
      kind: 'ghost',
    });
  });

  it('falls back to matched user nodes', () => {
    expect(locateTarget('t_html', comparison, ghostTrees)).toEqual({
      nodeId: 'u_html',
      kind: 'user',
    });
  });

  it('returns null for unknown ids', () => {
    expect(locateTarget('t_nope', comparison, ghostTrees)).toBeNull();
  });
});

const map: KnowledgeMap = {
  id: 'm',
  title: 'map',
  updatedAt: '2026-01-01T00:00:00.000Z',
  root: {
    id: 'u_root',
    topic: '我的知识',
    children: [
      { id: 'u_html', topic: 'HTML', children: [] },
      { id: 'u_build', topic: '工程化', children: [] },
    ],
  },
};

const target: TargetSystem = {
  id: 't',
  title: 'target',
  updatedAt: '2026-01-01T00:00:00.000Z',
  source: 'template',
  root: {
    id: 't_root',
    topic: '目标',
    children: [
      { id: 't_html', topic: 'html', children: [] },
      { id: 't_eng', topic: '工程化', children: [] },
      { id: 't_missing', topic: '性能优化', children: [] },
    ],
  },
};

describe('findNodeByTopic', () => {
  it('matches NFKC-normalized, case-insensitive topics', () => {
    expect(findNodeByTopic(map.root, 'html', 'zh')).toBe('u_html');
    expect(findNodeByTopic(map.root, 'ＨＴＭＬ', 'en')).toBe('u_html');
  });

  it('returns null when nothing matches', () => {
    expect(findNodeByTopic(map.root, '性能优化', 'zh')).toBeNull();
  });
});

describe('locateInMap', () => {
  it('prefers the ghost node over a topic match', () => {
    expect(locateInMap('t_eng', target, map, comparison, ghostTrees, 'zh')).toEqual({
      nodeId: 'ghost-t_eng',
      kind: 'ghost',
    });
  });

  it('falls back to the target topic when no comparison exists', () => {
    expect(locateInMap('t_html', target, map, null, [], 'zh')).toEqual({
      nodeId: 'u_html',
      kind: 'user',
    });
  });

  it('returns null when the topic is absent from the map', () => {
    expect(locateInMap('t_missing', target, map, null, [], 'zh')).toBeNull();
  });

  it('returns null for ids outside the target', () => {
    expect(locateInMap('t_nope', target, map, null, [], 'zh')).toBeNull();
  });

  it('passes canvas ids straight through (search results)', () => {
    expect(locateInMap('u_build', target, map, null, [], 'zh')).toEqual({
      nodeId: 'u_build',
      kind: 'user',
    });
  });
});
