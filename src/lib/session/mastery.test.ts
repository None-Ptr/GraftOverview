import { describe, expect, it } from 'vitest';
import type {
  ComparisonResult,
  KnowledgeMap,
  KnowledgeNode,
  TargetSystem,
  TestSession,
} from '$lib/types';
import { computeMastery } from './mastery';

function node(id: string, topic: string, children: KnowledgeNode[] = []): KnowledgeNode {
  return { id, topic, children };
}

const snapshot: TargetSystem = {
  id: 't',
  title: 'target',
  updatedAt: '2026-01-01T00:00:00.000Z',
  source: 'template',
  root: node('t_root', '前端开发', [
    node('t_html', 'HTML'),
    node('t_eng', '工程化', [node('t_vite', 'Vite')]),
    node('t_perf', '性能'),
  ]),
};

const attempt: KnowledgeMap = {
  id: 'a',
  title: 'attempt',
  updatedAt: '2026-01-01T00:00:00.000Z',
  root: node('u_root', '前端开发', [node('u_html', 'HTML'), node('u_eng', '工程化')]),
};

const session: TestSession = {
  id: 's1',
  mode: 'test',
  status: 'submitted',
  startedAt: '2026-01-01T00:00:00.000Z',
  submittedAt: '2026-01-01T00:10:00.000Z',
  targetSnapshot: snapshot,
  attempt,
  resultId: 'r1',
};

const result: ComparisonResult = {
  id: 'r1',
  createdAt: '2026-01-01T00:10:00.000Z',
  mapSignature: 'm',
  targetSignature: 't',
  matches: [{ targetId: 't_html', userNodeId: 'u_html', confidence: 0.9 }],
  gaps: [],
  extras: [],
  stats: { targetNodes: 4, matchedNodes: 1, gapNodes: 3, coverage: 0.25 },
  model: { host: 'x', model: 'y' },
};

const emptyMap = (): KnowledgeNode => node('r', '我的知识');

describe('computeMastery', () => {
  it('marks matches as mastered with confidence', () => {
    const mastery = computeMastery(session, result, emptyMap(), 'zh', '2026-01-01T00:10:00.000Z');
    expect(mastery.t_html).toMatchObject({ state: 'mastered', confidence: 0.9, sessionId: 's1' });
  });

  it('marks unmatched but drawn nodes as learning', () => {
    const mastery = computeMastery(session, result, emptyMap(), 'zh');
    expect(mastery.t_eng?.state).toBe('learning');
    expect(mastery.t_eng?.confidence).toBeNull();
  });

  it('falls back to the workspace map for nodes not recalled', () => {
    const mastery = computeMastery(
      session,
      result,
      node('r', '我的知识', [node('u_perf', '性能')]),
      'zh',
    );
    expect(mastery.t_perf?.state).toBe('learning');
  });

  it('omits nodes that exist nowhere and skips the root', () => {
    const mastery = computeMastery(session, result, emptyMap(), 'zh');
    expect(mastery.t_vite).toBeUndefined();
    expect(mastery.t_root).toBeUndefined();
  });

  it('downgrades a previously mastered node when the new attempt misses it', () => {
    const mastery = computeMastery(
      session,
      { ...result, matches: [] },
      node('r', '我的知识', [node('u_html2', 'html')]),
      'zh',
    );
    expect(mastery.t_html?.state).toBe('learning');
  });
});
