import { expect, test } from '@playwright/test';
import { SEED_WORKSPACE, seedStorage } from './helpers';

const BIG_TARGET = {
  ...SEED_WORKSPACE,
  target: {
    ...SEED_WORKSPACE.target,
    root: {
      id: 't_root',
      topic: '前端开发',
      children: Array.from({ length: 14 }, (_, i) => ({
        id: `t_${i}`,
        topic: `分支 ${i}`,
        children: [
          { id: `t_${i}_a`, topic: '要点 A', children: [] },
          { id: `t_${i}_b`, topic: '要点 B', children: [] },
        ],
      })),
    },
  },
};

test('primary actions sit above the target tree and stay pinned while scrolling', async ({
  page,
}) => {
  await seedStorage(page, BIG_TARGET);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await page.waitForTimeout(800);

  const bar = page.locator('aside.panel .action-bar');
  await expect(bar).toBeVisible();
  await expect(bar.getByRole('button', { name: '开始测试' })).toBeVisible();

  // The action bar precedes the tree in the document.
  const order = await page.evaluate(() => {
    const panel = document.querySelector('aside.panel .content');
    if (!panel) return -1;
    const bar = panel.querySelector('.action-bar');
    const tree = panel.querySelector('.tree');
    if (!bar || !tree) return -1;
    return bar.compareDocumentPosition(tree) & Node.DOCUMENT_POSITION_FOLLOWING ? 1 : 0;
  });
  expect(order).toBe(1);

  // Scrolling the tree keeps the actions reachable.
  await page.locator('aside.panel .content').evaluate((el) => el.scrollTo(0, 700));
  await page.waitForTimeout(300);
  await expect(bar.getByRole('button', { name: '开始测试' })).toBeVisible();
});

test('the overflow menu holds the secondary target actions', async ({ page }) => {
  await seedStorage(page, SEED_WORKSPACE);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await page.waitForTimeout(800);

  await page.getByRole('button', { name: '更多' }).first().click();
  const menu = page.getByRole('menu');
  await expect(menu).toBeVisible();
  await expect(menu.getByRole('menuitem', { name: '编辑目标' })).toBeVisible();
  await expect(menu.getByRole('menuitem', { name: '重新生成' })).toBeVisible();

  await menu.getByRole('menuitem', { name: '编辑目标' }).click();
  await expect(page.locator('dialog[open]')).toBeVisible();
});
