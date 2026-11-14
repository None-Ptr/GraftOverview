import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('$lib/llm/client', () => ({ chatCompletion: vi.fn() }));

import { chatCompletion, type ChatResult } from '$lib/llm/client';
import { generateTarget, LlmError, runComparison } from './run';
import { DEFAULT_LLM_SETTINGS } from '$lib/storage/llm';
import type {
  GoalSpec,
  KnowledgeMap,
  StoredLlmSettings,
  TargetSystem,
} from '$lib/types';

const settings: StoredLlmSettings = { ...DEFAULT_LLM_SETTINGS, apiKey: 'sk-secret' };
const mocked = vi.mocked(chatCompletion);

function reply(content: string, finishReason = 'stop'): ChatResult {
  return { content, finishReason };
}

const goal: GoalSpec = {
  domain: '前端',
  goal: '能独立做项目',
  level: 'beginner',
  locale: 'zh',
};

function makeTarget(): TargetSystem {
  return {
    id: 't',
    title: '目标',
    updatedAt: '2026-01-01T00:00:00.000Z',
    source: 'template',
    root: {
      id: 't_root',
      topic: '前端开发',
      children: [
        { id: 't_html', topic: 'HTML', children: [] },
        { id: 't_js', topic: 'JavaScript', children: [] },
      ],
    },
  };
}

function makeMap(): KnowledgeMap {
  return {
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
}

const generatedJson = JSON.stringify({
  title: '前端体系',
  root: { topic: '前端', note: '说明', children: [{ topic: 'HTML', children: [] }] },
});

beforeEach(() => {
  mocked.mockReset();
});

describe('generateTarget', () => {
  it('returns a validated tree with client-assigned ids', async () => {
    mocked.mockResolvedValueOnce(reply(generatedJson));
    const result = await generateTarget(goal, settings);
    expect(result.title).toBe('前端体系');
    expect(result.root.topic).toBe('前端');
    expect(result.root.children[0].topic).toBe('HTML');
    expect(result.root.id.length).toBeGreaterThan(0);
  });

  it('repairs invalid JSON once', async () => {
    mocked.mockResolvedValueOnce(reply('oops not json'));
    mocked.mockResolvedValueOnce(reply(generatedJson));
    const result = await generateTarget(goal, settings);
    expect(result.title).toBe('前端体系');
    expect(mocked).toHaveBeenCalledTimes(2);
  });

  it('throws parse after a failed repair', async () => {
    mocked.mockResolvedValueOnce(reply('nope'));
    mocked.mockResolvedValueOnce(reply('still nope'));
    await expect(generateTarget(goal, settings)).rejects.toMatchObject({ code: 'parse' });
  });

  it('treats finish_reason=length as truncated', async () => {
    mocked.mockResolvedValueOnce(reply(generatedJson, 'length'));
    await expect(generateTarget(goal, settings)).rejects.toMatchObject({ code: 'truncated' });
  });

  it('rejects more than 140 nodes', async () => {
    const huge = {
      title: 'huge',
      root: { topic: 'r', children: Array.from({ length: 150 }, () => ({ topic: 'c', children: [] })) },
    };
    mocked.mockResolvedValueOnce(reply(JSON.stringify(huge)));
    await expect(generateTarget(goal, settings)).rejects.toMatchObject({ code: 'tooMany' });
  });
});

describe('runComparison', () => {
  it('returns a validated comparison', async () => {
    mocked.mockResolvedValueOnce(
      reply(
        JSON.stringify({
          matches: [
            { targetId: 't1', userNodeId: 'u1', confidence: 0.9 },
            { targetId: 't2', userNodeId: 'u2', confidence: 0.8 },
          ],
          gaps: [{ targetId: 't3', suggestedUserParentId: 'u2', priority: 'high' }],
        }),
      ),
    );
    const result = await runComparison(makeMap(), makeTarget(), settings, 'zh', []);
    expect(result.matches).toHaveLength(2);
    expect(result.gaps).toHaveLength(1);
    expect(result.stats).toEqual({ targetNodes: 3, matchedNodes: 2, gapNodes: 1, coverage: 2 / 3 });
    expect(result.model.host).toBe('api.openai.com');
    expect(JSON.stringify(result)).not.toContain('sk-secret');
  });

  it('throws empty when the model returns nothing usable', async () => {
    mocked.mockResolvedValueOnce(reply(JSON.stringify({ matches: [], gaps: [] })));
    await expect(runComparison(makeMap(), makeTarget(), settings, 'zh', [])).rejects.toMatchObject({
      code: 'empty',
    });
  });

  it('blocks more than 400 nodes without calling the model', async () => {
    const huge = makeTarget();
    huge.root.children = Array.from({ length: 401 }, (_, i) => ({
      id: `t${i}`,
      topic: `n${i}`,
      children: [],
    }));
    await expect(runComparison(makeMap(), huge, settings, 'zh', [])).rejects.toMatchObject({
      code: 'tooMany',
    });
    expect(mocked).not.toHaveBeenCalled();
  });

  it('runs one coverage repair when id coverage is low', async () => {
    mocked.mockResolvedValueOnce(
      reply(JSON.stringify({ matches: [{ targetId: 't1', userNodeId: 'u1' }], gaps: [] })),
    );
    mocked.mockResolvedValueOnce(
      reply(
        JSON.stringify({
          matches: [{ targetId: 't1', userNodeId: 'u1' }],
          gaps: [
            { targetId: 't2', suggestedUserParentId: 'u1' },
            { targetId: 't3', suggestedUserParentId: 'u1' },
          ],
        }),
      ),
    );
    const result = await runComparison(makeMap(), makeTarget(), settings, 'zh', []);
    expect(mocked).toHaveBeenCalledTimes(2);
    expect(result.gaps).toHaveLength(2);
  });

  it('propagates LlmError from the client', async () => {
    mocked.mockRejectedValueOnce(new LlmError('rateLimit'));
    await expect(runComparison(makeMap(), makeTarget(), settings, 'zh', [])).rejects.toMatchObject({
      code: 'rateLimit',
    });
  });
});
