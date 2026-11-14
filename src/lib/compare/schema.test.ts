import { describe, expect, it } from 'vitest';
import type { KnowledgeMap, TargetSystem } from '$lib/types';
import { serializeTrees } from './serialize';
import {
  parseJsonObject,
  validateComparison,
  validateGeneratedTarget,
  type ValidationContext,
} from './schema';
import { LlmError } from '$lib/llm/errors';

function fixture() {
  const target: TargetSystem = {
    id: 't',
    title: '目标',
    updatedAt: '2026-01-01T00:00:00.000Z',
    source: 'template',
    root: {
      id: 't_root',
      topic: '前端开发',
      children: [
        {
          id: 't_html',
          topic: 'HTML / CSS',
          children: [{ id: 't_flex', topic: 'Flex / Grid', children: [] }],
        },
        { id: 't_js', topic: 'JavaScript', children: [] },
      ],
    },
  };
  const map: KnowledgeMap = {
    id: 'm',
    title: '我的导图',
    updatedAt: '2026-01-01T00:00:00.000Z',
    root: {
      id: 'u_root',
      topic: '我的知识',
      children: [
        { id: 'u_html', topic: 'HTML', children: [] },
        { id: 'u_js', topic: 'JS', children: [] },
      ],
    },
  };
  const trees = serializeTrees(target, map);
  const ctx: ValidationContext = {
    index: trees.index,
    target,
    map,
    locale: 'zh',
    ignoredSignatures: [],
    mapSignature: 'map-sig',
    targetSignature: 'target-sig',
    model: { host: 'api.example.com', model: 'example-1' },
    id: 'cmp-1',
    createdAt: '2026-01-01T00:00:00.000Z',
  };
  return { target, map, ctx, trees };
}

const validRaw = {
  matches: [
    { targetId: 't1', userNodeId: 'u1', confidence: 0.95 },
    { targetId: 't2', userNodeId: 'u2', confidence: 2 },
    { targetId: 't3', userNodeId: 'u2', confidence: -1 },
  ],
  gaps: [
    {
      targetId: 't4',
      suggestedUserParentId: 'u2',
      reason: '  缺一块\n内容  ',
      selfCheck: ['', '能解释吗？', '   ', '会吗？', '多余的'],
      links: [
        { title: 'Vite', url: 'https://vite.dev/guide/' },
        { title: '恶意', url: 'javascript:alert(1)' },
        { title: '多余', url: 'https://example.com/3' },
      ],
      priority: 'urgent',
    },
  ],
  extras: [{ userNodeId: 'u3', reason: '目标没有' }],
};

describe('parseJsonObject', () => {
  it('strips ```json fences and surrounding prose', () => {
    const raw = 'Here you go:\n```json\n{"a":1}\n```\nThanks!';
    expect(parseJsonObject(raw)).toEqual({ a: 1 });
  });

  it('throws on non-JSON', () => {
    expect(() => parseJsonObject('nope')).toThrow();
  });
});

describe('validateComparison', () => {
  it('maps short ids back to real ids and computes stats', () => {
    const { ctx } = fixture();
    const validation = validateComparison(validRaw, ctx);
    expect(validation.result).not.toBeNull();
    const result = validation.result!;
    expect(result.matches).toHaveLength(3);
    expect(result.matches[0]).toEqual({ targetId: 't_root', userNodeId: 'u_root', confidence: 0.95 });
    expect(result.matches[1].confidence).toBe(1);
    expect(result.matches[2].confidence).toBe(0);
    expect(result.gaps[0].targetId).toBe('t_js');
    expect(result.gaps[0].suggestedParentId).toBe('u_html');
    expect(result.gaps[0].nodeCount).toBe(1);
    expect(result.stats).toEqual({ targetNodes: 4, matchedNodes: 3, gapNodes: 1, coverage: 0.75 });
    expect(result.model).toEqual({ host: 'api.example.com', model: 'example-1' });
    expect(result.mapSignature).toBe('map-sig');
  });

  it('cleans fields (reason, selfCheck, links, priority)', () => {
    const { ctx } = fixture();
    const gap = validateComparison(validRaw, ctx).result!.gaps[0];
    expect(gap.reason).toBe('缺一块 内容');
    expect(gap.selfCheck).toEqual(['能解释吗？', '会吗？', '多余的']);
    expect(gap.links).toHaveLength(2);
    expect(gap.links.every((l) => l.url.startsWith('https://'))).toBe(true);
    expect(gap.priority).toBe('medium');
  });

  it('falls back when reason / selfCheck / links are empty', () => {
    const { ctx } = fixture();
    const gap = validateComparison(
      { matches: [], gaps: [{ targetId: 't4', reason: '', selfCheck: ['  '], links: [] }] },
      ctx,
    ).result!.gaps[0];
    expect(gap.reason.length).toBeGreaterThan(0);
    expect(gap.selfCheck).toHaveLength(1);
    expect(gap.links).toEqual([]);
  });

  it('keeps the match and drops a duplicate gap for the same target', () => {
    const { ctx } = fixture();
    const validation = validateComparison(
      {
        matches: [{ targetId: 't2', userNodeId: 'u2' }],
        gaps: [{ targetId: 't2' }, { targetId: 't2' }],
      },
      ctx,
    );
    expect(validation.result!.matches).toHaveLength(1);
    expect(validation.result!.gaps).toHaveLength(0);
    expect(validation.dropped.duplicate).toBe(2);
  });

  it('drops unknown target/user ids and counts them', () => {
    const { ctx } = fixture();
    const validation = validateComparison(
      {
        matches: [{ targetId: 't999', userNodeId: 'u1' }, { targetId: 't1', userNodeId: 'u999' }],
        gaps: [{ targetId: 't999' }],
        extras: [{ userNodeId: 'u999', reason: 'x' }],
      },
      ctx,
    );
    expect(validation.dropped.unknownTarget).toBe(2);
    expect(validation.dropped.unknownUser).toBe(1);
    expect(validation.dropped.unknownExtras).toBe(1);
    expect(validation.warnings).toContain('unknownIds');
  });

  it('drops a descendant gap when its ancestor is also a gap', () => {
    const { ctx } = fixture();
    const validation = validateComparison(
      { matches: [], gaps: [{ targetId: 't2' }, { targetId: 't3' }, { targetId: 't4' }] },
      ctx,
    );
    expect(validation.dropped.descendant).toBe(1);
    expect(validation.result!.gaps.map((g) => g.targetId).sort()).toEqual(['t_html', 't_js']);
  });

  it('nulls an unknown suggested parent', () => {
    const { ctx } = fixture();
    const validation = validateComparison(
      { matches: [], gaps: [{ targetId: 't4', suggestedUserParentId: 'nope' }] },
      ctx,
    );
    expect(validation.result!.gaps[0].suggestedParentId).toBeNull();
    expect(validation.dropped.invalidParent).toBe(1);
  });

  it('returns null for an empty result', () => {
    const { ctx } = fixture();
    expect(validateComparison({ matches: [], gaps: [], extras: [] }, ctx).result).toBeNull();
    expect(validateComparison('not an object', ctx).result).toBeNull();
  });

  it('truncates more than 60 gaps keeping high priority first', () => {
    const bigTarget: TargetSystem = {
      id: 't',
      title: '大目标',
      updatedAt: '2026-01-01T00:00:00.000Z',
      source: 'template',
      root: {
        id: 't_root',
        topic: '根',
        children: Array.from({ length: 70 }, (_, i) => ({
          id: `t_c${i}`,
          topic: `节点${i}`,
          children: [],
        })),
      },
    };
    const { map } = fixture();
    const trees = serializeTrees(bigTarget, map);
    const ctx: ValidationContext = {
      ...fixture().ctx,
      index: trees.index,
      target: bigTarget,
    };
    const many = Array.from({ length: 70 }, (_, i) => ({
      targetId: `t${i + 2}`,
      priority: i < 40 ? 'high' : 'low',
    }));
    const validation = validateComparison({ matches: [], gaps: many }, ctx);
    const gaps = validation.result!.gaps;
    expect(gaps).toHaveLength(60);
    expect(gaps.slice(0, 40).every((g) => g.priority === 'high')).toBe(true);
    expect(gaps.slice(40).every((g) => g.priority === 'low')).toBe(true);
    expect(validation.warnings).toContain('truncatedGaps');
  });

  it('marks ignored gaps but does not inflate coverage', () => {
    const { ctx } = fixture();
    const base = validateComparison(validRaw, ctx).result!;
    const signature = base.gaps[0].signature;
    const ignored = validateComparison(validRaw, { ...ctx, ignoredSignatures: [signature] }).result!;
    expect(ignored.gaps[0].status).toBe('ignored');
    expect(ignored.stats).toEqual(base.stats);
    expect(ignored.gaps).toHaveLength(1);
    expect(ignored.stats.coverage).toBe(0.75);
  });

  it('computes idCoverage for the repair decision', () => {
    const { ctx } = fixture();
    expect(validateComparison(validRaw, ctx).idCoverage).toBe(1);
    expect(
      validateComparison({ matches: [{ targetId: 't1', userNodeId: 'u1' }] }, ctx).idCoverage,
    ).toBe(0.25);
  });
});

describe('validateGeneratedTarget', () => {
  it('assigns fresh ids and rejects LLM-provided ids', () => {
    const raw = {
      title: '体系',
      root: {
        id: 'TRUST_ME',
        topic: '根',
        note: '说明',
        children: [{ id: 'X', topic: '子', children: [] }],
      },
    };
    const { root } = validateGeneratedTarget(raw, 'zh');
    expect(root.id).not.toBe('TRUST_ME');
    expect(root.children[0].id).not.toBe('X');
    expect(root.id.length).toBeGreaterThan(0);
  });

  it('rejects more than 140 nodes and depth > 4', () => {
    const chain = {
      title: 't',
      root: {
        topic: 'l1',
        children: [
          {
            topic: 'l2',
            children: [
              { topic: 'l3', children: [{ topic: 'l4', children: [{ topic: 'l5', children: [] }] }] },
            ],
          },
        ],
      },
    };
    expect(() => validateGeneratedTarget(chain, 'zh')).toThrow(LlmError);

    const wide = {
      title: 't',
      root: { topic: 'r', children: Array.from({ length: 150 }, () => ({ topic: 'c', children: [] })) },
    };
    expect(() => validateGeneratedTarget(wide, 'zh')).toThrow(LlmError);
  });

  it('flags a thin target without rejecting', () => {
    const small = { title: 't', root: { topic: 'r', children: [] } };
    expect(validateGeneratedTarget(small, 'zh').tooThin).toBe(true);
  });
});
