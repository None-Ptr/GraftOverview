import type { TargetSystem } from '$lib/types';
import { serializeOutline } from '$lib/target/outline';
import { TEMPLATE_DEFINITIONS } from '$lib/content/templates';
import type { Locale } from '$lib/types';
import type { TemplatePack } from './types';
import { slugify } from './slug';

export function serializePack(pack: TemplatePack): string {
  return JSON.stringify(pack, null, 2);
}

/** Export a workspace's target system as a one-template pack. */
export function buildPackFromTarget(target: TargetSystem, locale: Locale = 'zh'): TemplatePack {
  return {
    format: 'GraftOverviewTemplatePack',
    version: 1,
    name: target.title.slice(0, 80),
    description: target.goal?.goal?.slice(0, 400),
    author: undefined,
    license: 'CC-BY-4.0',
    locale,
    templates: [
      {
        id: slugify(target.title),
        title: target.title.slice(0, 60),
        description: '',
        outline: serializeOutline(target.root),
      },
    ],
  };
}

/** Export every built-in template as one pack (useful for contributing). */
export function buildPackFromBuiltins(locale: Locale = 'zh'): TemplatePack {
  return {
    format: 'GraftOverviewTemplatePack',
    version: 1,
    name: 'GraftOverview built-in templates',
    description: 'All bundled templates, exportable as a contribution starting point.',
    license: 'MIT',
    locale,
    templates: TEMPLATE_DEFINITIONS.map((definition) => ({
      id: definition.id,
      title: definition.title,
      description: definition.description,
      outline: definition.outline,
    })),
  };
}
