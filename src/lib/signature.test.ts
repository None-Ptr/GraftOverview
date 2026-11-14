import { describe, expect, it } from 'vitest';
import {
  fnv1a,
  mapSignature,
  nodePathSignatures,
  normalizeText,
  pathSignature,
  signatureTree,
} from './signature';
import type { KnowledgeMap } from './types';

const makeMap = (): KnowledgeMap => ({
  id: 'm1',
  title: '我的前端知识',
  updatedAt: '2026-11-13T00:00:00.000Z',
  root: {
    id: 'u_root',
    topic: '我的前端知识',
    children: [
      {
        id: 'u_html',
        topic: 'HTML / CSS',
        children: [{ id: 'u_flex', topic: 'Flex / Grid', children: [] }],
      },
    ],
  },
});

describe('fnv1a', () => {
  it('is stable and hex encoded', () => {
    expect(fnv1a('')).toBe('811c9dc5');
    expect(fnv1a('hello')).toBe(fnv1a('hello'));
    expect(fnv1a('hello')).not.toBe(fnv1a('world'));
    expect(fnv1a('hello')).toMatch(/^[0-9a-f]{8}$/);
  });
});

describe('normalizeText', () => {
  it('applies NFKC, trims, collapses whitespace, lowercases', () => {
    expect(normalizeText('  ＨＴＭＬ   Cache  ')).toBe('html cache');
  });
});

describe('signatureTree', () => {
  it('keeps structure and normalized topics but drops ids/notes', () => {
    const tree = signatureTree(makeMap().root);
    expect(tree.t).toBe('我的前端知识');
    expect(tree.c[0].t).toBe('html / css');
    expect(JSON.stringify(tree)).not.toContain('u_html');
  });
});

describe('mapSignature', () => {
  it('is independent of ids and notes', () => {
    const a = makeMap();
    const b = makeMap();
    b.root.id = 'different';
    b.root.children[0].note = 'a note';
    expect(mapSignature(a)).toBe(mapSignature(b));
  });

  it('changes when a topic changes', () => {
    const a = makeMap();
    const b = makeMap();
    b.root.children[0].topic = 'CSS';
    expect(mapSignature(a)).not.toBe(mapSignature(b));
  });
});

describe('pathSignature / nodePathSignatures', () => {
  it('hashes the normalized ancestor path', () => {
    expect(pathSignature(['HTML / CSS', 'Flex / Grid'])).toBe(
      pathSignature(['html / css', 'flex / grid']),
    );
  });

  it('produces one signature per node', () => {
    const sigs = nodePathSignatures(makeMap().root);
    expect(sigs.size).toBe(3);
    expect(sigs.get('u_flex')).toBe(pathSignature(['我的前端知识', 'HTML / CSS', 'Flex / Grid']));
  });
});
