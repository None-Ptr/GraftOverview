import { describe, expect, it } from 'vitest';
import { TEMPLATES, TEMPLATE_DEFINITIONS, getTemplate, getTemplateMeta } from './index';
import { countNodes, maxDepth } from '$lib/target/outline';

function collectIds(node: { id: string; children: unknown[] }, out: string[] = []): string[] {
  out.push(node.id);
  for (const child of node.children) {
    collectIds(child as { id: string; children: unknown[] }, out);
  }
  return out;
}

describe('templates', () => {
  it('ships 8 built-in templates', () => {
    expect(TEMPLATE_DEFINITIONS).toHaveLength(8);
    expect(TEMPLATES.map((t) => t.id)).toEqual([
      'frontend',
      'algorithms',
      'product',
      'english',
      'data',
      'design',
      'writing',
      'backend',
    ]);
  });

  for (const meta of TEMPLATES) {
    describe(meta.id, () => {
      it('has 60–100 nodes', () => {
        expect(meta.nodeCount).toBeGreaterThanOrEqual(60);
        expect(meta.nodeCount).toBeLessThanOrEqual(100);
      });

      it('is at most 4 levels deep', () => {
        const system = getTemplate(meta.id)!;
        expect(maxDepth(system.root)).toBeLessThanOrEqual(4);
      });

      it('uses stable, unique, prefixed ids', () => {
        const a = getTemplate(meta.id)!;
        const b = getTemplate(meta.id)!;
        const idsA = collectIds(a.root);
        const idsB = collectIds(b.root);
        expect(idsA).toEqual(idsB);
        expect(new Set(idsA).size).toBe(idsA.length);
        expect(idsA.every((id) => id.startsWith(`tpl-${meta.id}-`))).toBe(true);
        expect(countNodes(a.root)).toBe(meta.nodeCount);
      });

      it('is fresh (no shared mutable tree) and carries notes', () => {
        const a = getTemplate(meta.id)!;
        const b = getTemplate(meta.id)!;
        a.root.topic = 'MUTATED';
        expect(b.root.topic).not.toBe('MUTATED');
        expect(hasNotes(b.root)).toBe(true);
      });

      it('is a template-sourced TargetSystem', () => {
        const system = getTemplate(meta.id)!;
        expect(system.source).toBe('template');
        expect(system.templateId).toBe(meta.id);
        expect(system.title).toBe(meta.title);
        expect(system.id.length).toBeGreaterThan(0);
      });
    });
  }

  it('returns null for unknown ids', () => {
    expect(getTemplate('nope')).toBeNull();
    expect(getTemplateMeta('nope')).toBeNull();
  });
});

function hasNotes(node: { note?: string; children: unknown[] }): boolean {
  if (node.note) return true;
  return node.children.some((child) => hasNotes(child as { note?: string; children: unknown[] }));
}
