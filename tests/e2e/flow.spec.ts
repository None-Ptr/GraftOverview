import { expect, test } from '@playwright/test';
import { mockComparisonEndpoint, readActiveWorkspace, seedStorage } from './helpers';

test('compare → ghost → adopt → export → share', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(`console: ${message.text()}`);
  });
  page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));

  await seedStorage(page);
  await mockComparisonEndpoint(page);
  await page.goto('/');
  await page.waitForTimeout(800);

  const topicsBefore = await page.locator('.me-tpc').count();
  expect(topicsBefore).toBe(2);

  await page.getByRole('button', { name: /开始对比/ }).first().click();
  await page.waitForTimeout(1500);

  // Suggestions and ghost nodes appear.
  await expect(page.locator('aside.panel')).toContainText('工程化');
  expect(await page.locator('.me-tpc[data-nodeid^="meghost-"]').count()).toBeGreaterThan(0);

  // Adopt the top gap: two nodes are inserted and the ghost layer clears.
  await page.getByRole('button', { name: /^采纳$/ }).first().click();
  await page.waitForTimeout(800);
  expect(await page.locator('.me-tpc').count()).toBe(topicsBefore + 2);
  expect(await page.locator('.me-tpc[data-nodeid^="meghost-"]').count()).toBe(0);

  // Persisted adopted status and no API key in the workspace.
  const persisted = (await readActiveWorkspace(page)) as {
    comparison: { gaps: { status: string }[] };
  };
  expect(persisted.comparison.gaps[0].status).toBe('adopted');
  expect(JSON.stringify(persisted)).not.toContain('test-key');

  // Markdown export downloads a file.
  const downloadPromise = page.waitForEvent('download', { timeout: 5000 });
  await page.getByRole('button', { name: '导出' }).first().click();
  await page.getByRole('button', { name: /Markdown/ }).first().click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/^graft-report-.*\.md$/);

  // Share link generation.
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: '分享只读预览' }).first().click();
  await page.getByRole('button', { name: '生成链接' }).first().click();
  const link = await page.locator('dialog input.link').first().inputValue();
  expect(link).toContain('#/share?d=');

  expect(errors).toEqual([]);
});

test('comparing without a key routes to settings', async ({ page }) => {
  await seedStorage(page);
  await page.addInitScript(() => {
    const raw = localStorage.getItem('graft.llm.v1');
    if (raw) {
      const settings = JSON.parse(raw);
      settings.apiKey = '';
      localStorage.setItem('graft.llm.v1', JSON.stringify(settings));
    }
  });
  await page.goto('/');
  await page.waitForTimeout(600);
  await page.getByRole('button', { name: /开始对比/ }).first().click();
  await expect(page.locator('dialog[open]')).toContainText('模型设置');
});
