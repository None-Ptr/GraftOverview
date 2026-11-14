import { describe, expect, it } from 'vitest';
import type { ComparisonResult, GapSuggestion } from '$lib/types';
import { diffComparisons, findPreviousComparison, signedPercent } from './diff';

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

function result(id: string, gaps: GapSuggestion[], coverage: number): ComparisonResult {
  const gapNodes = gaps.reduce((sum, item) => sum + item.nodeCount, 0);
  return {
    id,
    createdAt: '2026-01-01T00:00:00.000Z',
    mapSignature: 'm',
    targetSignature: 't',
    matches: [],
    gaps,
    extras: [],
    stats: { targetNodes: 10, matchedNodes: 10 - gapNodes, gapNodes, coverage },
    model: { host: 'h', model: 'm' },
  };
}

describe('diffComparisons', () => {
  it('returns null without both sides', () => {
    expect(diffComparisons(null, result('b', [], 1))).toBeNull();
    expect(diffComparisons(result('a', [], 1), null)).toBeNull();
  });

  it('computes coverage delta and new/resolved gaps', () => {
    const prev = result('a', [gap('keep'), gap('gone')], 0.5);
    const next = result('b', [gap('keep'), gap('new')], 0.8);
    const diff = diffComparisons(prev, next)!;
    expect(diff.coverageDelta).toBeCloseTo(0.3);
    expect(diff.newGaps.map((g) => g.signature)).toEqual(['new']);
    expect(diff.resolvedGaps.map((g) => g.signature)).toEqual(['gone']);
    expect(diff.gapNodesDelta).toBe(0);
  });

  it('reports a negative delta', () => {
    const diff = diffComparisons(result('a', [], 0.10), result('b', [gap('x', 3)], 0.9))!;
    expect(diff.coverageDelta).toBeCloseTo(0.8);
    expect(diff.gapNodesDelta).toBe(3);
  });
});

describe('findPreviousComparison', () => {
  it('skips the current comparison', () => {
    const a = result('a', [], 0.5);
    const b = result('b', [], 0.8);
    expect(findPreviousComparison([{ result: b }, { result: a }], b)).toBe(a);
    expect(findPreviousComparison([{ result: b }], b)).toBeNull();
    expect(findPreviousComparison([{ result: b }], null)).toBeNull();
  });
});

describe('signedPercent', () => {
  it('formats deltas with a sign', () => {
    expect(signedPercent(0.12)).toBe('+12%');
    expect(signedPercent(-0.08)).toBe('−8%');
    expect(signedPercent(0)).toBe('±0%');
    expect(signedPercent(0.004)).toBe('±0%');
  });
});
