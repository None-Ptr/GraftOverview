import { describe, expect, it } from 'vitest';
import type { KnowledgeNode } from '$lib/types';
import { mergeTrees } from './merge';

function node(id: string, topic: string, children: KnowledgeNode[] = []): KnowledgeNode {
  return { id, topic, children };
}

describe('mergeTrees', () => {
  it('merges children with the same normalized topic recursively', () => {
    const base = node('b', '我的知识', [node('x', 'HTML', [node('x1', '标签')])]);
    const incoming = node('a', '前端开发', [node('y', 'html', [node('y1', '可访问性')])]);
    const merged = mergeTrees(base, incoming, 'zh');
    const html = merged.children[0];
    expect(merged.children).toHaveLength(1);
    expect(html.id).toBe('x');
    expect(html.children.map((child) => child.topic)).toEqual(['标签', '可访问性']);
  });

  it('appends new branches with fresh ids', () => {
    const base = node('b', '我的知识', []);
    const incoming = node('a', '前端开发', [node('y', '工程化', [node('y1', 'Vite')])]);
    const merged = mergeTrees(base, incoming, 'zh');
    expect(merged.children).toHaveLength(1);
    expect(merged.children[0].id).not.toBe('y');
    expect(merged.children[0].children[0].id).not.toBe('y1');
    expect(merged.children[0].topic).toBe('工程化');
  });

  it('keeps base notes and ids untouched', () => {
    const base = node('b', '我的知识', [{ ...node('x', 'HTML'), note: '已有备注' }]);
    const merged = mergeTrees(base, node('a', '前端开发', [node('y', 'HTML')]), 'zh');
    expect(merged.children[0].note).toBe('已有备注');
    expect(merged.children[0].id).toBe('x');
  });
});
