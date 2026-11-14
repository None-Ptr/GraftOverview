import { expect, test } from '@playwright/test';
import { SEED_WORKSPACE, seedStorage } from './helpers';

const COMPARISON = {
  id: 'cmp',
  createdAt: '2026-01-01T00:00:00.000Z',
  mapSignature: 'x',
  targetSignature: 'y',
  matches: [{ targetId: 't_html', userNodeId: 'u_html', confidence: 0.9 }],
  gaps: [
    {
      signature: 'sig_eng',
      targetId: 't_eng',
      suggestedParentId: 'u_root',
      topic: '工程化',
      reason: '缺少构建链路',
      selfCheck: ['能配置构建吗？'],
      links: [],
      priority: 'high',
      nodeCount: 2,
      status: 'pending',
    },
  ],
  extras: [],
  stats: { targetNodes: 4, matchedNodes: 1, gapNodes: 3, coverage: 0.25 },
  model: { host: 'x', model: 'y' },
};

const WITH_COMPARISON = { ...SEED_WORKSPACE, comparison: COMPARISON };
const NO_COMPARISON = { ...SEED_WORKSPACE, comparison: null };

const selectedNode = (page: import('@playwright/test').Page) =>
  page.evaluate(
    () =>
      (document.querySelector('.me-tpc.selected') as HTMLElement | null)?.dataset.nodeid ?? null,
  );

test('locates a matched target node on the canvas', async ({ page }) => {
  await seedStorage(page, WITH_COMPARISON);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await page.waitForTimeout(900);

  await page.locator('aside.panel button', { hasText: 'HTML' }).first().click();
  await page.waitForTimeout(500);
  expect(await selectedNode(page)).toBe('meu_html');
});

test('locates a gap on the ghost layer', async ({ page }) => {
  await seedStorage(page, WITH_COMPARISON);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await page.waitForTimeout(900);

  await page.locator('aside.panel button', { hasText: '工程化' }).first().click();
  await page.waitForTimeout(500);
  expect(await selectedNode(page)).toBe('meghost-t_eng');
});

test('locates by topic before any comparison exists', async ({ page }) => {
  await seedStorage(page, NO_COMPARISON);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await page.waitForTimeout(900);

  await page.locator('aside.panel button', { hasText: 'HTML' }).first().click();
  await page.waitForTimeout(400);
  await page.getByRole('button', { name: '在画布中定位' }).click();
  await page.waitForTimeout(500);
  expect(await selectedNode(page)).toBe('meu_html');
});

test('explains when a target node is not on the canvas', async ({ page }) => {
  await seedStorage(page, NO_COMPARISON);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await page.waitForTimeout(900);

  await page.locator('aside.panel button', { hasText: '前端开发' }).first().click();
  await expect(page.locator('.toast', { hasText: '画布上没有对应节点' }).first()).toBeVisible();
});

test('locates from the canvas search popover', async ({ page }) => {
  await seedStorage(page, NO_COMPARISON);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await page.waitForTimeout(800);

  await page.keyboard.press('Control+f');
  const input = page.locator('.popover input');
  await input.fill('HTML');
  await page.waitForTimeout(500);
  await page.locator('.results .row').first().click();
  await page.waitForTimeout(500);

  expect(await selectedNode(page)).toBe('meu_html');
});
