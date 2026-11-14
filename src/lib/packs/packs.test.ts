import { beforeEach, describe, expect, it, vi } from 'vitest';
import { parsePack, PACK_LIMITS } from './schema';
import { slugify } from './slug';
import { buildPackFromBuiltins, buildPackFromTarget, serializePack } from './serialize';
import type { TemplatePack } from './types';
import type { TargetSystem } from '$lib/types';

function makeMemoryStorage(): Storage {
  const data = new Map<string, string>();
  return {
    get length() {
      return data.size;
    },
    clear: () => data.clear(),
    getItem: (key: string) => data.get(key) ?? null,
    key: (index: number) => [...data.keys()][index] ?? null,
    removeItem: (key: string) => data.delete(key),
    setItem: (key: string, value: string) => void data.set(key, value),
  } as Storage;
}

function outline(count: number): string {
  const lines = ['- 主题 :: 说明'];
  for (let i = 0; i < count - 1; i += 1) lines.push(`  - 节点${i}`);
  return lines.join('\n');
}

function makePack(overrides: Partial<TemplatePack> = {}): unknown {
  return {
    format: 'GraftOverviewTemplatePack',
    version: 1,
    name: 'My Pack',
    license: 'CC-BY-4.0',
    locale: 'zh',
    templates: [{ id: 'alpha', title: 'Alpha', description: 'd', outline: outline(13) }],
    ...overrides,
  };
}

describe('slugify', () => {
  it('lowercases and hyphenates ascii', () => {
    expect(slugify('Data Analysis!')).toBe('data-analysis');
    expect(slugify('  A  B ')).toBe('a-b');
  });
  it('falls back for empty / non-ascii', () => {
    expect(slugify('前端进阶')).toBe('pack');
    expect(slugify('')).toBe('pack');
  });
});

describe('parsePack', () => {
  it('accepts a valid pack and trims fields', () => {
    const result = parsePack(makePack({ name: '  My Pack  ', description: ' hi ' }));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.pack.name).toBe('My Pack');
      expect(result.pack.description).toBe('hi');
      expect(result.pack.templates[0].id).toBe('alpha');
    }
  });

  it('rejects wrong format / version / missing license / empty', () => {
    expect(parsePack(null)).toMatchObject({ ok: false, code: 'invalid' });
    expect(parsePack(makePack({ format: 'x' as never }))).toMatchObject({ ok: false, code: 'invalid' });
    expect(parsePack(makePack({ version: 2 as never }))).toMatchObject({ ok: false, code: 'future' });
    expect(parsePack(makePack({ license: '' }))).toMatchObject({ ok: false, code: 'noLicense' });
    expect(parsePack(makePack({ templates: [] }))).toMatchObject({ ok: false, code: 'empty' });
  });

  it('enforces template limits and ids', () => {
    const many = { templates: Array.from({ length: PACK_LIMITS.templates + 1 }, (_, i) => ({ id: `t${i}`, title: 'T', description: '', outline: outline(12) })) };
    expect(parsePack(makePack(many))).toMatchObject({ ok: false, code: 'tooMany' });

    const badId = { templates: [{ id: 'Bad_ID', title: 'T', description: '', outline: outline(12) }] };
    expect(parsePack(makePack(badId))).toMatchObject({ ok: false, code: 'badId' });

    const dup = {
      templates: [
        { id: 'a', title: 'A', description: '', outline: outline(12) },
        { id: 'a', title: 'B', description: '', outline: outline(12) },
      ],
    };
    expect(parsePack(makePack(dup))).toMatchObject({ ok: false, code: 'duplicateId' });
  });

  it('validates each outline', () => {
    const badOutline = { templates: [{ id: 'a', title: 'A', description: '', outline: '- root\n   - bad' }] };
    expect(parsePack(makePack(badOutline))).toMatchObject({ ok: false, code: 'badTemplate' });

    const small = { templates: [{ id: 'a', title: 'A', description: '', outline: outline(5) }] };
    expect(parsePack(makePack(small))).toMatchObject({ ok: false, code: 'tooSmall' });

    const large = { templates: [{ id: 'a', title: 'A', description: '', outline: outline(250) }] };
    expect(parsePack(makePack(large))).toMatchObject({ ok: false, code: 'tooLarge' });
  });
});

describe('serialize round-trip', () => {
  it('exports the built-in set and parses it back', () => {
    const pack = buildPackFromBuiltins();
    expect(pack.templates).toHaveLength(8);
    const parsed = parsePack(JSON.parse(serializePack(pack)));
    expect(parsed.ok).toBe(true);
    if (parsed.ok) expect(parsed.pack.templates).toHaveLength(8);
  });

  it('exports a target system as a one-template pack', () => {
    const target: TargetSystem = {
      id: 't',
      title: '我的目标',
      updatedAt: '2026-01-01T00:00:00.000Z',
      source: 'template',
      root: {
        id: 'r',
        topic: '我的目标',
        children: Array.from({ length: 12 }, (_, i) => ({ id: `c${i}`, topic: `节点${i}`, children: [] })),
      },
    };
    const parsed = parsePack(JSON.parse(serializePack(buildPackFromTarget(target))));
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.pack.templates).toHaveLength(1);
      expect(parsed.pack.name).toBe('我的目标');
    }
  });
});

describe('pack store + catalog', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', makeMemoryStorage());
    vi.resetModules();
  });

  it('imports, replaces by slug, and resolves catalog templates', async () => {
    const { packStore } = await import('./store.svelte');
    const { listCatalog, getCatalogTemplate } = await import('$lib/templates/catalog.svelte');

    packStore.packs = [];
    const parsed = parsePack(makePack({ name: 'Community Pack' }));
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;

    const stored = packStore.importPack(parsed.pack);
    expect(stored.slug).toBe('community-pack');
    expect(packStore.packs).toHaveLength(1);

    // Re-importing the same name replaces, not duplicates.
    packStore.importPack(parsed.pack);
    expect(packStore.packs).toHaveLength(1);

    const communityUid = 'community-pack::alpha';
    expect(listCatalog().some((item) => item.uid === communityUid)).toBe(true);
    const target = getCatalogTemplate(communityUid);
    expect(target).not.toBeNull();
    expect(target?.source).toBe('imported');
    expect(target?.root.topic).toBe('主题');

    // Built-ins still resolve.
    expect(getCatalogTemplate('frontend')?.title).toBe('前端开发');
    expect(getCatalogTemplate('unknown')).toBeNull();

    packStore.removePack('community-pack');
    expect(packStore.packs).toHaveLength(0);
    expect(getCatalogTemplate(communityUid)).toBeNull();
  });
});
