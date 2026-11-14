import { nanoid } from 'nanoid';
import type { TargetSystem } from '$lib/types';
import { TEMPLATES, getTemplate as getBuiltinTemplate } from '$lib/content/templates';
import { countNodes, parseOutline } from '$lib/target/outline';
import { packStore } from '$lib/packs/store.svelte';

export interface CatalogTemplate {
  uid: string;
  title: string;
  description: string;
  nodeCount: number;
  source: 'builtin' | 'community';
  packName?: string;
}

const SEPARATOR = '::';

function communityUid(slug: string, templateId: string): string {
  return `${slug}${SEPARATOR}${templateId}`;
}

/** Built-in templates + every imported community template, for the picker. */
export function listCatalog(): CatalogTemplate[] {
  const builtins: CatalogTemplate[] = TEMPLATES.map((template) => ({
    uid: template.id,
    title: template.title,
    description: template.description,
    nodeCount: template.nodeCount,
    source: 'builtin',
  }));

  const community: CatalogTemplate[] = [];
  for (const pack of packStore.packs) {
    for (const template of pack.templates) {
      const parsed = parseOutline(template.outline, {
        idFactory: (index) => `c${index}`,
        wrapTitle: template.title,
      });
      community.push({
        uid: communityUid(pack.slug, template.id),
        title: template.title,
        description: template.description,
        nodeCount: parsed.root ? countNodes(parsed.root) : 0,
        source: 'community',
        packName: pack.name,
      });
    }
  }
  return [...builtins, ...community];
}

/** Resolve a catalog uid (built-in id, or "slug::templateId") to a fresh target. */
export function getCatalogTemplate(uid: string): TargetSystem | null {
  const index = uid.indexOf(SEPARATOR);
  if (index < 0) return getBuiltinTemplate(uid);
  const slug = uid.slice(0, index);
  const templateId = uid.slice(index + SEPARATOR.length);
  const pack = packStore.packs.find((item) => item.slug === slug);
  const template = pack?.templates.find((item) => item.id === templateId);
  if (!template) return null;
  const parsed = parseOutline(template.outline, {
    idFactory: (i) => `tpl-${slug}-${templateId}-${i}`,
    wrapTitle: template.title,
  });
  if (!parsed.root) return null;
  return {
    id: nanoid(10),
    title: template.title,
    // Serialization timestamp, not reactive state.
    // eslint-disable-next-line svelte/prefer-svelte-reactivity
    updatedAt: new Date().toISOString(),
    root: parsed.root,
    source: 'imported',
    templateId: uid,
  };
}
