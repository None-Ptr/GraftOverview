import { expect, test } from '@playwright/test';

test('shell loads without console errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(`console: ${message.text()}`);
  });
  page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));

  await page.goto('/');

  // First run shows the onboarding guide; dismiss it before testing the shell.
  const start = page.getByRole('button', { name: '开始使用' });
  if (await start.isVisible().catch(() => false)) await start.click();

  await expect(page.locator('header.topbar')).toBeVisible();
  await expect(page.locator('.wordmark')).toContainText('Graft');
  await expect(page.locator('aside.panel')).toBeVisible();
  await expect(page.locator('.me-root')).toBeVisible();
  await expect(page.locator('.host')).toHaveAttribute('tabindex', '-1');
  expect(errors).toEqual([]);
});

test('theme persistence and first-frame attribute', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('graft.theme', 'dark'));
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
});

test('invalid share link shows a recovery screen', async ({ page }) => {
  await page.goto('/#/share?d=garbage');
  await expect(page.getByText('分享链接不可用')).toBeVisible();
});
