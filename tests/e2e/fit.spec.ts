import { expect, test } from '@playwright/test';
import { seedStorage } from './helpers';

const EMPTY = {
  schemaVersion: 1,
  map: {
    id: 'empty-m',
    title: '我的导图',
    updatedAt: '2026-01-01T00:00:00.000Z',
    root: { id: 'u_root', topic: '我的知识', children: [] as unknown[] },
  },
  target: null,
  comparison: null,
  ignoredSignatures: [] as string[],
  ui: { locale: 'zh', panelTab: 'target' },
};

/** A map tall enough that 100% zoom cannot fit the canvas. */
const TALL = {
  ...EMPTY,
  map: {
    ...EMPTY.map,
    root: {
      id: 'u_root',
      topic: '我的知识',
      children: Array.from({ length: 24 }, (_, i) => ({
        id: `u_${i}`,
        topic: `分支 ${i}`,
        children: [
          { id: `u_${i}_a`, topic: '子主题', children: [] },
          { id: `u_${i}_b`, topic: '另一个', children: [] },
        ],
      })),
    },
  },
};

interface FitInfo {
  fits: boolean;
  zoom: number;
  nodes: number;
}

async function fitInfo(page: import('@playwright/test').Page): Promise<FitInfo> {
  return page.evaluate(() => {
    const container = document.querySelector('.map-container')?.getBoundingClientRect();
    const content = document.querySelector('.map-canvas .me-nodes')?.getBoundingClientRect();
    if (!container || !content) return { fits: false, zoom: 0, nodes: 0 };
    const tolerance = 2;
    return {
      fits:
        content.width <= container.width + tolerance &&
        content.height <= container.height + tolerance &&
        content.left >= container.left - tolerance &&
        content.top >= container.top - tolerance &&
        content.right <= container.right + tolerance &&
        content.bottom <= container.bottom + tolerance,
      zoom: Number(document.body.innerText.match(/(\d+)%/)?.[1] ?? 0),
      nodes: document.querySelectorAll('.me-tpc').length,
    };
  });
}

test('a large map is fitted into the canvas on load', async ({ page }) => {
  await seedStorage(page, TALL);
  await page.setViewportSize({ width: 1000, height: 900 });
  await page.goto('/');
  await page.waitForTimeout(900);

  const info = await fitInfo(page);
  expect(info.nodes).toBeGreaterThan(50);
  expect(info.zoom).toBeLessThan(100);
  expect(info.fits).toBe(true);
});

test('seeding a draft from a template re-fits the canvas', async ({ page }) => {
  await seedStorage(page, EMPTY);
  await page.setViewportSize({ width: 1000, height: 900 });
  await page.goto('/');
  await page.waitForTimeout(500);

  await page.getByRole('button', { name: '内置模板' }).first().click();
  await page.locator('dialog[open] .card').filter({ hasText: '算法与数据结构' }).first().click();
  await page.waitForTimeout(1200);

  const info = await fitInfo(page);
  expect(info.nodes).toBeGreaterThan(1);
  expect(info.fits).toBe(true);
});

test('the map surface fills the canvas column', async ({ page }) => {
  await seedStorage(page, TALL);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await page.waitForTimeout(800);

  const measure = () =>
    page.evaluate(() => {
      const canvas = document.querySelector('section.canvas')?.getBoundingClientRect();
      const surface = document.querySelector('.map-container')?.getBoundingClientRect();
      if (!canvas || !surface) return null;
      return {
        left: Math.round(surface.left - canvas.left),
        top: Math.round(surface.top - canvas.top),
        right: Math.round(canvas.right - surface.right),
        bottom: Math.round(canvas.bottom - surface.bottom),
      };
    });

  expect(await measure()).toEqual({ left: 0, top: 0, right: 0, bottom: 0 });

  // Narrow viewport: still full-bleed, and the map re-fits to the new width.
  await page.setViewportSize({ width: 375, height: 812 });
  await page.waitForTimeout(600);
  expect(await measure()).toEqual({ left: 0, top: 0, right: 0, bottom: 0 });
  expect((await fitInfo(page)).fits).toBe(true);
});
