import { expect, test } from '@playwright/test';
import { seedStorage } from './helpers';

const WIDTHS = [320, 375, 414, 768, 1280, 1440];

for (const width of WIDTHS) {
  test(`no horizontal page scroll at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 820 });
    await seedStorage(page);
    await page.goto('/');
    await page.waitForTimeout(500);

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(overflow).toBeLessThanOrEqual(1);

    // Open the mobile panel where it is a drawer / sheet.
    if (width <= 960) {
      await page.getByRole('button', { name: '面板' }).first().click();
      await page.waitForTimeout(400);
      const overflowWithPanel = await page.evaluate(
        () => document.documentElement.scrollWidth - window.innerWidth,
      );
      expect(overflowWithPanel).toBeLessThanOrEqual(1);
    }
  });
}
