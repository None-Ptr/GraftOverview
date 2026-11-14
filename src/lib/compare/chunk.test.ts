import { describe, expect, it } from 'vitest';
import type { ComparisonResult, GapSuggestion, TargetSystem } from '$lib/types';
import { CHUNK_THRESHOLD, mergeResults, planChunks } from './chunk';
import { findTreeNode, topLevelBranches } from './scope';

function makeTarget(branchCount: number, childrenPerBranch: number): TargetSystem {
  return {
    id: 't',
    title: '目标',
    updatedAt: '2026-01-01T00:00:00.000Z',
    source: 'template',
    root: {
      id: 't_root',
      topic: '根',
      children: Array.from({ length: branchCount }, (_, b) => ({
        id: `b${b}`,
        topic: `分支${b}`,
        children: Array.from({ length: childrenPerBranch }, (_, c) => ({
          id: `b${b}c${c}`,
          topic: `节点${b}-${c}`,
          children: [],
        })),
      })),
    },
  };
}

describe('findTreeNode / topLevelBranches', () => {
  it('finds nested nodes and lists branches', () => {
    const target = makeTarget(3, 2);
    expect(findTreeNode(target.root, 'b1c1')?.topic).toBe('节点1-1');
    expect(findTreeNode(target.root, 'missing')).toBeNull();
    expect(topLevelBranches(target.root).map((n) => n.id)).toEqual(['b0', 'b1', 'b2']);
  });
});

describe('planChunks', () => {
  it('uses a single chunk for a scoped branch', () => {
    const target = makeTarget(3, 2);
    const chunks = planChunks(target, 'b1');
    expect(chunks).toHaveLength(1);
    expect(chunks[0].scope).toBe('b1');
    expect(chunks[0].label).toBe('分支1');
    expect(chunks[0].nodes).toBe(3);
  });

  it('uses a single chunk for a small target', () => {
    const target = makeTarget(2, 2);
    const chunks = planChunks(target, null);
    expect(chunks).toEqual([{ scope: null, label: '目标', nodes: 7 }]);
  });

  it('splits a large target by top-level branch', () => {
    const target = makeTarget(4, Math.ceil(CHUNK_THRESHOLD / 4));
    const total = 1 + 4 * (1 + Math.ceil(CHUNK_THRESHOLD / 4));
    expect(total).toBeGreaterThan(CHUNK_THRESHOLD);
    const chunks = planChunks(target, null);
    expect(chunks).toHaveLength(4);
    expect(chunks.every((chunk) => chunk.scope !== null)).toBe(true);
  });

  it('falls back to one chunk when there is a single branch', () => {
    const target = makeTarget(1, CHUNK_THRESHOLD + 10);
    expect(planChunks(target, null)).toHaveLength(1);
  });
});

function gap(signature: string, nodeCount = 1): GapSuggestion {
  return {
    signature,
    targetId: `t_${signature}`,
    suggestedParentId: null,
    topic: signature,
    reason: 'r',
    selfCheck: [],
    links: [],
    priority: 'high',
    nodeCount,
    status: 'pending',
  };
}

function part(id: string, gaps: GapSuggestion[]): ComparisonResult {
  return {
    id,
    createdAt: '2026-01-01T00:00:00.000Z',
    mapSignature: 'old',
    targetSignature: 'old',
    matches: [{ targetId: 'm1', userNodeId: 'u1', confidence: 0.9 }],
    gaps,
    extras: [{ userNodeId: 'u2', reason: 'x' }],
    stats: { targetNodes: 3, matchedNodes: 3, gapNodes: 0, coverage: 1 },
    model: { host: 'h', model: 'm' },
  };
}

describe('mergeResults', () => {
  it('dedupes matches/gaps/extras and recomputes stats over the full target', () => {
    const merged = mergeResults(
      [part('a', [gap('g1', 2)]), part('b', [gap('g1', 2), gap('g2', 1)])],
      10,
      { mapSignature: 'new-map', targetSignature: 'new-target' },
    );
    expect(merged.matches).toHaveLength(1);
    expect(merged.gaps.map((g) => g.signature).sort()).toEqual(['g1', 'g2']);
    expect(merged.extras).toHaveLength(1);
    expect(merged.stats).toEqual({ targetNodes: 10, matchedNodes: 7, gapNodes: 3, coverage: 0.7 });
    expect(merged.mapSignature).toBe('new-map');
    expect(merged.targetSignature).toBe('new-target');
  });

  it('handles an empty list defensively', () => {
    const merged = mergeResults([], 5, { mapSignature: 'm', targetSignature: 't' });
    expect(merged.stats.targetNodes).toBe(5);
    expect(merged.matches).toEqual([]);
  });
});
