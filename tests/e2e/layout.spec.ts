import { expect, test } from '@playwright/test';
import { seedStorage } from './helpers';

test('primary compare button keeps its label and icon on one line without clipping', async ({
  page,
}) => {
  await seedStorage(page);
  await page.goto('/');
  await page.waitForTimeout(500);

  const button = page.locator('button.btn').filter({ hasText: '开始对比' }).first();
  await expect(button).toBeVisible();

  const box = await button.evaluate((el) => {
    const text = el.querySelector('.label-desktop');
    const icon = el.querySelector('svg');
    if (!text || !icon) return null;
    const btn = el.getBoundingClientRect();
    const t = text.getBoundingClientRect();
    const i = icon.getBoundingClientRect();
    const html = el as HTMLElement;
    return {
      textTop: t.top,
      iconTop: i.top,
      textRight: t.right,
      iconLeft: i.left,
      iconBottom: i.bottom,
      btnBottom: btn.bottom,
      clientH: html.clientHeight,
      scrollH: html.scrollHeight,
    };
  });

  expect(box).not.toBeNull();
  // Text and icon share a row (not stacked).
  expect(Math.abs(box!.textTop - box!.iconTop)).toBeLessThan(8);
  // Icon is to the right of the text, not underneath it.
  expect(box!.iconLeft).toBeGreaterThanOrEqual(box!.textRight - 1);
  // Nothing spills below the button.
  expect(box!.iconBottom).toBeLessThanOrEqual(box!.btnBottom + 1);
  expect(box!.scrollH).toBeLessThanOrEqual(box!.clientH + 1);
});
