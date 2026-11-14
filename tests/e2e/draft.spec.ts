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

test('empty state "从目标生成初稿" copies a template onto the canvas', async ({ page }) => {
  await seedStorage(page, EMPTY);
  await page.goto('/');
  await page.waitForTimeout(500);

  // Canvas starts with only the root node.
  expect(await page.locator('.me-tpc').count()).toBe(1);

  await page.getByRole('button', { name: '从目标生成初稿' }).first().click();
  const cards = page.locator('dialog[open] .card');
  await expect(cards).toHaveCount(8);

  await cards.filter({ hasText: '算法与数据结构' }).first().click();
  await page.waitForTimeout(700);

  // The target template should now exist as a draft on the canvas.
  expect(await page.locator('.me-tpc').count()).toBeGreaterThan(1);
});

test('importing a template while the canvas is empty seeds a draft', async ({ page }) => {
  await seedStorage(page, EMPTY);
  await page.goto('/');
  await page.waitForTimeout(500);

  expect(await page.locator('.me-tpc').count()).toBe(1);

  await page.getByRole('button', { name: '内置模板' }).first().click();
  const cards = page.locator('dialog[open] .card');
  await expect(cards).toHaveCount(8);
  await cards.filter({ hasText: '算法与数据结构' }).first().click();
  await page.waitForTimeout(700);

  expect(await page.locator('.me-tpc').count()).toBeGreaterThan(1);
});
