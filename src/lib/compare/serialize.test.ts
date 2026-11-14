import { describe, expect, it } from 'vitest';
import type { KnowledgeMap, TargetSystem } from '$lib/types';
import { countNodes, indexNodes, serializeTrees } from './serialize';

const target: TargetSystem = {
  id: 't',
  title: '前端',
  updatedAt: '2026-01-01T00:00:00.000Z',
  source: 'template',
  root: {
    id: 't_root',
    topic: '前端开发',
    note: '能独立完成一个中等复杂度的 Web 应用，包含打包、测试、部署与性能调优的完整链路说明',
    children: [
      {
        id: 't_html',
        topic: 'HTML | CSS',
        note: '语义化',
        children: [{ id: 't_flex', topic: 'Flex / Grid', note: '布局', children: [] }],
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
    note: 'SHOULD NOT BE SENT',
    children: [
      { id: 'u_html', topic: 'HTML', note: 'ALSO NOT SENT', children: [] },
    ],
  },
};

describe('serializeTrees', () => {
  it('assigns short t*/u* ids and builds bidirectional indexes', () => {
    const trees = serializeTrees(target, map);
    expect(trees.index.target.get('t1')).toBe('t_root');
    expect(trees.index.target.get('t2')).toBe('t_html');
    expect(trees.index.target.get('t3')).toBe('t_flex');
    expect(trees.index.target.get('t4')).toBe('t_js');
    expect(trees.index.user.get('u1')).toBe('u_root');
    expect(trees.index.user.get('u2')).toBe('u_html');
    expect(trees.index.targetShort.get('t_flex')).toBe('t3');
    expect(trees.index.userShort.get('u_html')).toBe('u2');
    expect(trees.index.targetNodes).toBe(4);
    expect(trees.index.userNodes).toBe(2);
  });

  it('formats id|depth|topic|note and truncates target notes to 60 chars', () => {
    const trees = serializeTrees(target, map);
    const lines = trees.targetText.split('\n');
    expect(lines[0]).toMatch(/^t1\|0\|前端开发\|/);
    expect(lines[0].split('|')[3].length).toBeLessThanOrEqual(60);
    expect(lines[1]).toBe('t2|1|HTML ／ CSS|语义化');
    expect(lines[2]).toBe('t3|2|Flex / Grid|布局');
    expect(lines[3]).toBe('t4|1|JavaScript|');
  });

  it('never sends user notes', () => {
    const trees = serializeTrees(target, map);
    expect(trees.userText).not.toContain('SHOULD NOT BE SENT');
    expect(trees.userText).not.toContain('ALSO NOT SENT');
    expect(trees.userText.split('\n')[1]).toBe('u2|1|HTML|');
  });

  it('tracks depth, parent and subtree size', () => {
    const trees = serializeTrees(target, map);
    expect(trees.index.targetDepth.get('t3')).toBe(2);
    expect(trees.index.targetParent.get('t3')).toBe('t2');
    expect(trees.index.targetParent.get('t1')).toBeNull();
    expect(trees.index.subtreeSize.get('t2')).toBe(2);
    expect(trees.index.subtreeSize.get('t3')).toBe(1);
    expect(trees.index.subtreeSize.get('t1')).toBe(4);
  });

  it('indexNodes / countNodes helpers', () => {
    const byId = indexNodes(target.root);
    expect(byId.get('t_flex')?.topic).toBe('Flex / Grid');
    expect(countNodes(target.root)).toBe(4);
  });
});
