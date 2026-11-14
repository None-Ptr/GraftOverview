import { describe, expect, it } from 'vitest';
import {
  MAX_OUTLINE_NODES,
  countNodes,
  maxDepth,
  parseOutline,
  serializeOutline,
} from './outline';

const SIMPLE = `- 前端开发 :: 能独立完成 Web 应用
  - HTML / CSS :: 语义化与布局
    - Flex / Grid
    - 响应式
  - JavaScript :: 语言核心`;

describe('parseOutline', () => {
  it('builds a single-root tree with topics and notes', () => {
    const { root, errors } = parseOutline(SIMPLE, { idFactory: (i) => `n${i}` });
    expect(errors).toEqual([]);
    expect(root?.topic).toBe('前端开发');
    expect(root?.note).toBe('能独立完成 Web 应用');
    expect(root?.children).toHaveLength(2);
    expect(root?.children[0].topic).toBe('HTML / CSS');
    expect(root?.children[0].children.map((n) => n.topic)).toEqual(['Flex / Grid', '响应式']);
    expect(root?.children[1].note).toBe('语言核心');
    expect(countNodes(root!)).toBe(5);
    expect(maxDepth(root!)).toBe(3);
  });

  it('round-trips through serializeOutline', () => {
    const first = parseOutline(SIMPLE, { idFactory: (i) => `n${i}` });
    const serialized = serializeOutline(first.root!);
    const second = parseOutline(serialized, { idFactory: (i) => `n${i}` });
    expect(second.errors).toEqual([]);
    expect(serializeOutline(second.root!)).toBe(serialized);
  });

  it('reports odd indentation and empty topics with line numbers', () => {
    const { errors } = parseOutline('- Root\n   - bad\n  - \n  - ok');
    expect(errors).toEqual([
      { line: 2, message: 'bad indent' },
      { line: 3, message: 'empty topic' },
    ]);
  });

  it('reports a missing root', () => {
    const { root, errors } = parseOutline('   \n');
    expect(root).toBeNull();
    expect(errors[0].message).toBe('no root');
  });

  it('wraps multiple top-level roots', () => {
    const { root, errors } = parseOutline('- A\n- B', {
      idFactory: (i) => `n${i}`,
      wrapTitle: '目标体系',
    });
    expect(errors).toEqual([]);
    expect(root?.topic).toBe('目标体系');
    expect(root?.children.map((n) => n.topic)).toEqual(['A', 'B']);
  });

  it('enforces the node limit', () => {
    const many = Array.from({ length: MAX_OUTLINE_NODES + 5 }, (_, i) => `- n${i}`).join('\n');
    const { root, errors } = parseOutline(many, { idFactory: (i) => `n${i}` });
    // Multiple top-level roots are wrapped in one extra synthetic root.
    expect(countNodes(root!)).toBeLessThanOrEqual(MAX_OUTLINE_NODES + 1);
    expect(errors.some((e) => e.message === 'node limit exceeded')).toBe(true);
  });

  it('truncates long topics and notes', () => {
    const long = 'x'.repeat(300);
    const { root } = parseOutline(`- ${long} :: ${long}`, { idFactory: () => 'n' });
    expect(root?.topic).toHaveLength(120);
    expect(root?.note).toHaveLength(200);
  });
});
