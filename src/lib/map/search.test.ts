import { describe, expect, it } from 'vitest';
import type { KnowledgeMap } from '$lib/types';
import { searchNodes } from './search';

const makeMap = (): KnowledgeMap => ({
  id: 'm',
  title: 'T',
  updatedAt: '2026-01-01T00:00:00.000Z',
  root: {
    id: 'root',
    topic: '前端开发',
    children: [
      {
        id: 'a',
        topic: 'ＨＴＭＬ / CSS',
        children: [{ id: 'a1', topic: 'Flex / Grid', children: [] }],
      },
      { id: 'b', topic: 'JavaScript', children: [] },
    ],
  },
});

describe('searchNodes', () => {
  it('returns nothing for an empty query', () => {
    expect(searchNodes(makeMap(), '  ')).toEqual([]);
  });

  it('is case-insensitive', () => {
    const results = searchNodes(makeMap(), 'javascript');
    expect(results).toHaveLength(1);
    expect(results[0].nodeId).toBe('b');
  });

  it('normalizes NFKC fullwidth characters', () => {
    const results = searchNodes(makeMap(), 'html');
    expect(results).toHaveLength(1);
    expect(results[0].nodeId).toBe('a');
  });

  it('includes the ancestor path', () => {
    const results = searchNodes(makeMap(), 'flex');
    expect(results[0].path).toEqual(['前端开发', 'ＨＴＭＬ / CSS', 'Flex / Grid']);
  });

  it('matches multiple nodes', () => {
    expect(searchNodes(makeMap(), '/')).toHaveLength(2);
  });
});
