import { describe, expect, it } from 'vitest';
import type { GapSuggestion } from '$lib/types';
import { activeGaps, computeStats, withIgnored } from './signature';

const gap = (signature: string, nodeCount: number): GapSuggestion => ({
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
});

describe('withIgnored / activeGaps', () => {
  it('marks matching signatures ignored without deleting them', () => {
    const gaps = [gap('a', 2), gap('b', 3)];
    const next = withIgnored(gaps, ['a']);
    expect(next).toHaveLength(2);
    expect(next[0].status).toBe('ignored');
    expect(next[1].status).toBe('pending');
    expect(activeGaps(next)).toEqual([next[1]]);
  });

  it('resets status back to pending on restore', () => {
    const ignored = withIgnored([gap('a', 1)], ['a']);
    expect(withIgnored(ignored, []).every((g) => g.status === 'pending')).toBe(true);
  });
});

describe('computeStats', () => {
  it('counts all gaps including ignored ones', () => {
    const gaps = withIgnored([gap('a', 2), gap('b', 3)], ['a']);
    expect(computeStats(gaps, 10)).toEqual({
      targetNodes: 10,
      matchedNodes: 5,
      gapNodes: 5,
      coverage: 0.5,
    });
  });

  it('clamps coverage to 0..1 and gapNodes to targetNodes', () => {
    expect(computeStats([gap('a', 50)], 10).coverage).toBe(0);
    expect(computeStats([], 10).coverage).toBe(1);
    expect(computeStats([], 0).coverage).toBe(0);
  });

  it('ignoring a gap never changes the score', () => {
    const gaps = [gap('a', 4)];
    expect(computeStats(withIgnored(gaps, ['a']), 8)).toEqual(computeStats(gaps, 8));
  });
});
