import { expect, test } from '@playwright/test';
import { SEED_WORKSPACE, seedStorage } from './helpers';

async function openOutlineEditor(page: import('@playwright/test').Page): Promise<void> {
  await page.keyboard.press('Control+K');
  await page.locator('dialog[open] li button', { hasText: '大纲' }).first().click();
  await expect(page.locator('dialog[open]')).toBeVisible();
}

test('the outline editor opens wide with a pinned action row', async ({ page }) => {
  await seedStorage(page, SEED_WORKSPACE);
  await page.setViewportSize({ width: 1000, height: 900 });
  await page.goto('/');
  await page.waitForTimeout(700);

  await openOutlineEditor(page);

  const box = await page.locator('dialog[open]').boundingBox();
  expect(box?.width ?? 0).toBeGreaterThan(700);

  // The form itself must not eat the action row.
  await expect(page.getByRole('button', { name: '保存' })).toBeInViewport();
  await expect(page.getByRole('button', { name: '导入 .md' })).toBeInViewport();
});

test('the outline editor switches to tabbed panes on narrow screens', async ({ page }) => {
  await seedStorage(page, SEED_WORKSPACE);
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/');
  await page.waitForTimeout(700);

  await openOutlineEditor(page);

  await expect(page.locator('.mobile-tabs')).toBeVisible();
  // Only one pane is visible at a time in tabbed mode.
  await expect(page.locator('.split .edit-pane')).toBeVisible();
  await expect(page.locator('.split .preview-pane')).toBeHidden();
});
