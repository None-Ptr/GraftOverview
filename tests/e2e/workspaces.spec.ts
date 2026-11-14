import { expect, test } from '@playwright/test';
import { seedStorage } from './helpers';

async function openSwitcher(page: import('@playwright/test').Page): Promise<void> {
  await page.locator('button.doc-title').click();
  await expect(page.locator('dialog[open]')).toContainText('管理工作区');
}

test('create a workspace, switch back, and keep maps isolated', async ({ page }) => {
  await seedStorage(page);
  await page.goto('/');
  await page.waitForTimeout(600);
  expect(await page.locator('.me-tpc').count()).toBe(2); // root + HTML

  await openSwitcher(page);
  await page.getByRole('button', { name: '新建工作区' }).click();
  await page.waitForTimeout(500);

  // New workspace is empty (root only) and active.
  await expect(page.locator('.doc-title-text')).toContainText('未命名工作区');
  expect(await page.locator('.me-tpc').count()).toBe(1);

  // Switch back to the original workspace: its map is intact.
  await openSwitcher(page);
  await page.locator('dialog[open] .pick').filter({ hasText: '我的导图' }).first().click();
  await page.waitForTimeout(500);
  await expect(page.locator('.doc-title-text')).toContainText('我的导图');
  expect(await page.locator('.me-tpc').count()).toBe(2);
});

test('rename and delete a workspace', async ({ page }) => {
  await seedStorage(page);
  await page.goto('/');
  await page.waitForTimeout(500);

  // Create a second workspace so the first can be deleted.
  await openSwitcher(page);
  await page.getByRole('button', { name: '新建工作区' }).click();
  await page.waitForTimeout(400);

  // Rename the active workspace.
  await openSwitcher(page);
  const activeRow = page.locator('dialog[open] .row.active');
  await activeRow.getByRole('button', { name: '重命名' }).click();
  await activeRow.locator('input.rename').fill('项目 B');
  await activeRow.getByRole('button', { name: '保存' }).click();
  await expect(page.locator('dialog[open] .row.active')).toContainText('项目 B');

  // Delete the other workspace (confirm step).
  const otherRow = page.locator('dialog[open] .row').filter({ hasText: '我的导图' }).first();
  await otherRow.getByRole('button', { name: '删除' }).click();
  await otherRow.getByRole('button', { name: '删除' }).click();
  await page.waitForTimeout(400);
  await expect(page.locator('dialog[open] .row')).toHaveCount(1);
  await expect(page.locator('dialog[open] .row')).toContainText('项目 B');
});
