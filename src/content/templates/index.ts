import { nanoid } from 'nanoid';
import type { TargetSystem } from '$lib/types';
import { countNodes, parseOutline } from '$lib/target/outline';
import type { TemplateDefinition, TemplateMeta } from './types';
import { frontend } from './frontend';
import { algorithms } from './algorithms';
import { product } from './product';
import { english } from './english';
import { data } from './data';
import { design } from './design';
import { writing } from './writing';
import { backend } from './backend';

export const TEMPLATE_DEFINITIONS: TemplateDefinition[] = [
  frontend,
  algorithms,
  product,
  english,
  data,
  design,
  writing,
  backend,
];

export const TEMPLATES: TemplateMeta[] = TEMPLATE_DEFINITIONS.map((definition) => {
  const parsed = parseOutline(definition.outline, {
    idFactory: (index) => `count-${index}`,
    wrapTitle: definition.title,
  });
  return {
    id: definition.id,
    title: definition.title,
    description: definition.description,
    nodeCount: parsed.root ? countNodes(parsed.root) : 0,
  };
});

export function getTemplateMeta(id: string): TemplateMeta | null {
  return TEMPLATES.find((template) => template.id === id) ?? null;
}

/** Build a fresh TargetSystem from a template. Never returns shared mutable data. */
export function getTemplate(id: string): TargetSystem | null {
  const definition = TEMPLATE_DEFINITIONS.find((item) => item.id === id);
  if (!definition) return null;
  const parsed = parseOutline(definition.outline, {
    idFactory: (index) => `tpl-${definition.id}-${index}`,
    wrapTitle: definition.title,
  });
  if (!parsed.root) return null;
  return {
    id: nanoid(10),
    title: definition.title,
    updatedAt: new Date().toISOString(),
    root: parsed.root,
    source: 'template',
    templateId: definition.id,
  };
}
