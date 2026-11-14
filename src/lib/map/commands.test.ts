import { describe, expect, it } from 'vitest';
import type { KnowledgeMap } from '$lib/types';
import {
  addChild,
  addSibling,
  cloneMap,
  countNodes,
  findNode,
  removeNode,
  renameNode,
  toggleCollapse,
} from './commands';

const makeMap = (): KnowledgeMap => ({
  id: 'm',
  title: 'T',
  updatedAt: '2026-01-01T00:00:00.000Z',
  root: {
    id: 'root',
    topic: 'Root',
    children: [
      { id: 'a', topic: 'A', children: [{ id: 'a1', topic: 'A1', children: [] }] },
      { id: 'b', topic: 'B', children: [] },
    ],
  },
});

describe('commands immutability', () => {
  it('never mutates the input map', () => {
    const original = makeMap();
    const snapshot = JSON.stringify(original);
    addChild(original, 'a', 'New');
    addSibling(original, 'a', 'Sib');
    renameNode(original, 'b', 'Renamed');
    removeNode(original, 'a1');
    toggleCollapse(original, 'a');
    expect(JSON.stringify(original)).toBe(snapshot);
  });
});

describe('addChild / addSibling', () => {
  it('adds a child with a generated id and given topic', () => {
    const next = addChild(makeMap(), 'a', '新节点');
    const a = findNode(next.root, 'a');
    expect(a?.children).toHaveLength(2);
    expect(a?.children[1].topic).toBe('新节点');
    expect(a?.children[1].id).not.toBe('a1');
    expect(a?.collapsed).toBe(false);
  });

  it('inserts a sibling right after the target', () => {
    const next = addSibling(makeMap(), 'a', 'Sib');
    expect(next.root.children.map((n) => n.topic)).toEqual(['A', 'Sib', 'B']);
  });

  it('falls back to a child when the root is the target', () => {
    const next = addSibling(makeMap(), 'root', 'Sib');
    expect(next.root.children).toHaveLength(3);
  });
});

describe('rename / remove / collapse', () => {
  it('renames a node', () => {
    expect(findNode(renameNode(makeMap(), 'b', 'Renamed').root, 'b')?.topic).toBe('Renamed');
  });

  it('removes a node', () => {
    const next = removeNode(makeMap(), 'a1');
    expect(findNode(next.root, 'a1')).toBeNull();
    expect(countNodes(next.root)).toBe(3);
  });

  it('never deletes the root', () => {
    const original = makeMap();
    expect(removeNode(original, 'root')).toBe(original);
  });

  it('toggles collapsed', () => {
    expect(findNode(toggleCollapse(makeMap(), 'a').root, 'a')?.collapsed).toBe(true);
  });
});

describe('cloneMap / countNodes', () => {
  it('produces a deep, independent copy', () => {
    const original = makeMap();
    const copy = cloneMap(original);
    copy.root.children[0].topic = 'Changed';
    expect(original.root.children[0].topic).toBe('A');
    expect(countNodes(original.root)).toBe(4);
  });
});
