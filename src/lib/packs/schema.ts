import { countNodes, maxDepth, parseOutline } from '$lib/target/outline';
import type { TemplatePack, TemplatePackTemplate } from './types';

export type PackErrorCode =
  | 'invalid'
  | 'future'
  | 'empty'
  | 'tooMany'
  | 'badTemplate'
  | 'tooSmall'
  | 'tooLarge'
  | 'badId'
  | 'duplicateId'
  | 'noLicense';

export type PackParse =
  | { ok: true; pack: TemplatePack }
  | { ok: false; code: PackErrorCode; detail?: string };

export const PACK_LIMITS = {
  templates: 50,
  nodes: { min: 10, max: 200 },
  depth: 5,
} as const;

const ID_RE = /^[a-z0-9][a-z0-9-]{0,63}$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function text(value: unknown, max: number): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function fail(code: PackErrorCode, detail?: string): PackParse {
  return { ok: false, code, detail };
}

/** Validate an untrusted pack file. Never trusts ids, lengths or outline shape. */
export function parsePack(raw: unknown): PackParse {
  if (!isRecord(raw)) return fail('invalid');
  if (raw.format !== 'GraftOverviewTemplatePack') return fail('invalid');
  if (typeof raw.version !== 'number') return fail('invalid');
  if (raw.version > 1) return fail('future');

  const name = text(raw.name, 80);
  if (!name) return fail('invalid');
  const license = text(raw.license, 40);
  if (!license) return fail('noLicense');

  const list = Array.isArray(raw.templates) ? raw.templates : [];
  if (list.length === 0) return fail('empty');
  if (list.length > PACK_LIMITS.templates) return fail('tooMany');

  const seen = new Set<string>();
  const templates: TemplatePackTemplate[] = [];
  for (const item of list) {
    if (!isRecord(item)) return fail('badTemplate');
    const id = text(item.id, 64);
    if (!ID_RE.test(id)) return fail('badId', id || String(item.id ?? ''));
    if (seen.has(id)) return fail('duplicateId', id);
    seen.add(id);

    const title = text(item.title, 60);
    if (!title) return fail('badTemplate');
    const outline = typeof item.outline === 'string' ? item.outline : '';
    const parsed = parseOutline(outline, {
      idFactory: (index) => `v${index}`,
      wrapTitle: title,
      maxNodes: PACK_LIMITS.nodes.max * 5,
    });
    if (!parsed.root || parsed.errors.length > 0) return fail('badTemplate', title);

    const nodes = countNodes(parsed.root);
    if (nodes < PACK_LIMITS.nodes.min) return fail('tooSmall', title);
    if (nodes > PACK_LIMITS.nodes.max || maxDepth(parsed.root) > PACK_LIMITS.depth) {
      return fail('tooLarge', title);
    }

    templates.push({
      id,
      title,
      description: text(item.description, 200),
      outline,
    });
  }

  const description = text(raw.description, 400);
  const author = text(raw.author, 80);
  const pack: TemplatePack = {
    format: 'GraftOverviewTemplatePack',
    version: 1,
    name,
    license,
    locale: raw.locale === 'en' ? 'en' : 'zh',
    templates,
    ...(description ? { description } : {}),
    ...(author ? { author } : {}),
  };
  return { ok: true, pack };
}
