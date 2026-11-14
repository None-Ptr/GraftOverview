export interface TemplatePackTemplate {
  id: string;
  title: string;
  description: string;
  /** Markdown-ish outline using the same 2-space `- topic :: note` format. */
  outline: string;
}

export interface TemplatePack {
  format: 'GraftOverviewTemplatePack';
  version: 1;
  name: string;
  description?: string;
  author?: string;
  license: string;
  locale: 'zh' | 'en';
  templates: TemplatePackTemplate[];
}

/** Stored pack keeps a runtime slug used to namespace template ids. */
export interface StoredPack extends TemplatePack {
  slug: string;
}
