import { describe, expect, it } from 'vitest';
import type { GhostTree, KnowledgeMap, KnowledgeNode } from '$lib/types';
import { fromMindElixirData, toMindElixirData } from './adapter';
import { isGhostId } from '$lib/locate';

const makeMap = (): KnowledgeMap => ({
  id: 'map-1',
  title: '我的前端知识',
  updatedAt: '2026-11-13T00:00:00.000Z',
  root: {
    id: 'u_root',
    topic: '我的前端知识',
    children: [
      {
        id: 'u_html',
        topic: 'HTML / CSS',
        note: '语义化与布局',
        collapsed: true,
        children: [{ id: 'u_flex', topic: 'Flex / Grid', children: [] }],
      },
      { id: 'u_js', topic: 'JavaScript', children: [] },
    ],
  },
});

function collectIds(node: KnowledgeNode): string[] {
  return [node.id, ...node.children.flatMap(collectIds)];
}

describe('adapter round-trip', () => {
  it('preserves id / topic / children / note / collapsed and map metadata', () => {
    const original = makeMap();
    const data = toMindElixirData(original, []);
    const restored = fromMindElixirData(data);

    expect(restored.id).toBe(original.id);
    expect(restored.title).toBe(original.title);
    expect(restored.updatedAt).toBe(original.updatedAt);
    expect(restored.root.id).toBe('u_root');
    expect(restored.root.children[0].id).toBe('u_html');
    expect(restored.root.children[0].note).toBe('语义化与布局');
    expect(restored.root.children[0].collapsed).toBe(true);
    expect(restored.root.children[0].children[0].topic).toBe('Flex / Grid');
    expect(restored.root.children[1].topic).toBe('JavaScript');
    expect(restored.root.collapsed).toBeUndefined();
  });

  it('does not mutate the canonical map', () => {
    const original = makeMap();
    const snapshot = JSON.stringify(original);
    toMindElixirData(original, [
      {
        signature: 'sig-1',
        parentId: 'u_root',
        priority: 'high',
        root: { id: 'ghost-t_eng', topic: '工程化', children: [] },
      },
    ]);
    expect(JSON.stringify(original)).toBe(snapshot);
  });

  it('renders ghost trees but never exports them', () => {
    const ghosts: GhostTree[] = [
      {
        signature: 'sig-1',
        parentId: 'u_js',
        priority: 'high',
        root: {
          id: 'ghost-t_eng',
          topic: '工程化',
          children: [{ id: 'ghost-t_vite', topic: 'Vite', children: [] }],
        },
      },
      {
        signature: 'sig-2',
        parentId: null,
        priority: 'high',
        root: { id: 'ghost-t_perf', topic: '性能', children: [] },
      },
    ];
    const original = makeMap();
    const data = toMindElixirData(original, ghosts);

    const rendered = data.nodeData as { children?: { id: string }[] };
    const renderedIds = rendered.children?.map((c) => c.id) ?? [];
    expect(renderedIds).toContain('ghost-t_perf');

    const restored = fromMindElixirData(data);
    const ids = collectIds(restored.root);
    expect(ids).not.toContain('ghost-t_eng');
    expect(ids).not.toContain('ghost-t_vite');
    expect(ids).not.toContain('ghost-t_perf');
    expect(ids.some(isGhostId)).toBe(false);
    expect(ids).toEqual(collectIds(original.root));
  });

  it('filters ghost nodes even when nested deep inside a subtree', () => {
    const data = toMindElixirData(makeMap(), []);
    const html = (data.nodeData as { children: { children: unknown[] }[] }).children[0];
    // Simulate a stray ghost that survived into a deeper level.
    (html.children as { id: string; children?: unknown[] }[]).push({
      id: 'ghost-stray',
      children: [],
    });
    const restored = fromMindElixirData(data);
    expect(collectIds(restored.root)).not.toContain('ghost-stray');
  });
});
