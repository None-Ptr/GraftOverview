import { loadPacks, savePacks } from './storage';
import { slugify } from './slug';
import type { StoredPack, TemplatePack } from './types';

/** Imported community packs (global, shared across workspaces). */
class PackStore {
  packs = $state<StoredPack[]>(loadPacks());

  /** Import or replace (by name slug) a validated pack. */
  importPack(pack: TemplatePack): StoredPack {
    const stored: StoredPack = { ...pack, slug: slugify(pack.name) };
    this.packs = [stored, ...this.packs.filter((item) => item.slug !== stored.slug)];
    savePacks(this.packs);
    return stored;
  }

  removePack(slug: string): void {
    this.packs = this.packs.filter((item) => item.slug !== slug);
    savePacks(this.packs);
  }
}

export const packStore = new PackStore();
