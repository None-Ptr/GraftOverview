import { expect, test } from '@playwright/test';
import { seedStorage } from './helpers';

const EMPTY = {
  schemaVersion: 1,
  map: {
    id: 'pack-m',
    title: '我的导图',
    updatedAt: '2026-01-01T00:00:00.000Z',
    root: { id: 'u_root', topic: '我的知识', children: [] as unknown[] },
  },
  target: null,
  comparison: null,
  ignoredSignatures: [] as string[],
  ui: { locale: 'zh', panelTab: 'target' },
};

const outline = ['- 测试模板 :: 说明', ...Array.from({ length: 12 }, (_, i) => `  - 节点${i}`)].join(
  '\n',
);

const pack = {
  format: 'GraftOverviewTemplatePack',
  version: 1,
  name: '测试模板包',
  description: '单元测试用',
  author: 'tester',
  license: 'CC-BY-4.0',
  locale: 'zh',
  templates: [{ id: 'test-pack', title: '测试模板', description: '示例', outline }],
};

test('import a template pack and apply it as a draft', async ({ page }) => {
  await seedStorage(page, EMPTY);
  await page.goto('/');
  await page.waitForTimeout(500);

  // Open the target picker from the empty target pane.
  await page.getByRole('button', { name: '内置模板' }).first().click();
  const dialog = page.locator('dialog[open]');
  await expect(dialog).toBeVisible();

  await dialog.locator('input.file-input').setInputFiles({
    name: 'pack.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(pack)),
  });

  // Review step, then import.
  await expect(dialog).toContainText('测试模板包');
  await dialog.getByRole('button', { name: '导入' }).click();
  await page.waitForTimeout(300);

  // The community template now appears; choose it.
  const community = dialog.locator('.pack-row .pick').filter({ hasText: '测试模板' }).first();
  await expect(community).toBeVisible();
  await community.click();
  await page.waitForTimeout(700);

  // Draft from the imported pack lands on the canvas.
  expect(await page.locator('.me-tpc').count()).toBeGreaterThan(1);
});

test('reject an invalid pack file', async ({ page }) => {
  await seedStorage(page, EMPTY);
  await page.goto('/');
  await page.waitForTimeout(500);
  await page.getByRole('button', { name: '内置模板' }).first().click();
  const dialog = page.locator('dialog[open]');

  await dialog.locator('input.file-input').setInputFiles({
    name: 'bad.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify({ format: 'nope' })),
  });
  await expect(dialog).toContainText('不是有效的模板包文件');
});

test('export the built-in pack downloads a json file', async ({ page }) => {
  await seedStorage(page);
  await page.goto('/');
  await page.waitForTimeout(500);

  const downloadPromise = page.waitForEvent('download', { timeout: 5000 });
  await page.getByRole('button', { name: '导出' }).first().click();
  await page.getByRole('button', { name: '导出内置模板包' }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/^graft-pack-.*\.json$/);
});
