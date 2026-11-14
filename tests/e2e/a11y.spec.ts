import { AxeBuilder } from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import LZString from 'lz-string';
import { seedStorage } from './helpers';

type AxeResults = Awaited<ReturnType<AxeBuilder['analyze']>>;
type AxeViolation = AxeResults['violations'][number];

function serious(violations: AxeViolation[]): AxeViolation[] {
  return violations.filter(
    (violation) => violation.impact === 'serious' || violation.impact === 'critical',
  );
}

function summarize(violations: AxeViolation[]): { id: string; nodes: number }[] {
  return violations.map((violation) => ({ id: violation.id, nodes: violation.nodes.length }));
}

for (const theme of ['light', 'dark'] as const) {
  test(`main workspace (${theme}) has no serious or critical a11y violations`, async ({ page }) => {
    await seedStorage(page, undefined, theme);
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
    await page.waitForTimeout(600);

    const results = await new AxeBuilder({ page }).analyze();
    expect(summarize(serious(results.violations))).toEqual([]);
  });

  test(`settings dialog (${theme}) has no serious or critical a11y violations`, async ({ page }) => {
    await seedStorage(page, undefined, theme);
    await page.goto('/');
    await page.waitForTimeout(500);
    await page.getByRole('button', { name: '设置' }).first().click();
    await expect(page.locator('dialog[open]')).toBeVisible();

    const results = await new AxeBuilder({ page }).include('dialog[open]').analyze();
    expect(summarize(serious(results.violations))).toEqual([]);
  });
}

test('command palette has no serious or critical a11y violations', async ({ page }) => {
  await seedStorage(page);
  await page.goto('/');
  await page.waitForTimeout(400);
  await page.keyboard.press('Control+K');
  await expect(page.locator('dialog[open]')).toBeVisible();

  const results = await new AxeBuilder({ page }).include('dialog[open]').analyze();
  expect(summarize(serious(results.violations))).toEqual([]);
});

test('workspace switcher has no serious or critical a11y violations', async ({ page }) => {
  await seedStorage(page);
  await page.goto('/');
  await page.waitForTimeout(400);
  await page.locator('button.doc-title').click();
  await expect(page.locator('dialog[open]')).toBeVisible();

  const results = await new AxeBuilder({ page }).include('dialog[open]').analyze();
  expect(summarize(serious(results.violations))).toEqual([]);
});

test('sidebar with the overflow menu open has no serious or critical a11y violations', async ({
  page,
}) => {
  await seedStorage(page);
  await page.goto('/');
  await page.waitForTimeout(500);
  await page.getByRole('button', { name: '更多' }).first().click();
  await expect(page.getByRole('menu')).toBeVisible();

  const results = await new AxeBuilder({ page }).include('aside.panel').analyze();
  expect(summarize(serious(results.violations))).toEqual([]);
});

test('share page has no serious or critical a11y violations', async ({ page }) => {
  const payload = {
    v: 1,
    m: {
      id: 'a11y-m',
      title: '分享的导图',
      updatedAt: '2026-01-01T00:00:00.000Z',
      root: { id: 's_root', topic: '分享的导图', children: [{ id: 's_a', topic: '节点 A', children: [] }] },
    },
    t: {
      id: 'a11y-t',
      title: '分享的目标',
      updatedAt: '2026-01-01T00:00:00.000Z',
      source: 'template',
      root: { id: 'st_root', topic: '分享的目标', children: [{ id: 'st_a', topic: '目标 A', note: '说明', children: [] }] },
    },
  };
  const encoded = LZString.compressToEncodedURIComponent(JSON.stringify(payload));
  await page.goto(`/#/share?d=${encoded}`);
  await page.waitForTimeout(700);

  const results = await new AxeBuilder({ page }).analyze();
  expect(summarize(serious(results.violations))).toEqual([]);
});
