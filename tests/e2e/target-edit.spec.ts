import { expect, test } from '@playwright/test';
import { SEED_WORKSPACE, seedStorage } from './helpers';

const readTarget = (page: import('@playwright/test').Page) =>
  page.evaluate(() => {
    const index = JSON.parse(localStorage.getItem('graft.workspaces.v2') ?? '{}') as {
      activeId?: string;
    };
    if (!index.activeId) return null;
    const raw = localStorage.getItem(`graft.workspace.v2.${index.activeId}`);
    if (!raw) return null;
    const target = JSON.parse(raw).target as {
      root: { id: string; children: { id: string; note?: string; children: { id: string }[] }[] };
    } | null;
    if (!target) return null;
    interface Countable {
      children?: unknown[];
    }
    const count = (node: Countable): number =>
      1 +
      (node.children ?? []).reduce<number>(
        (sum, child) => sum + count(child as Countable),
        0,
      );
    return { nodes: count(target.root), root: target.root };
  });

test('edits the target on the canvas, with undo and autosave', async ({ page }) => {
  await seedStorage(page, SEED_WORKSPACE);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await page.waitForTimeout(800);

  await page.getByRole('button', { name: '在画布中编辑' }).click();
  await expect(page.locator('.mode-label')).toContainText('正在编辑目标体系');
  // The canvas now shows the target tree (root + 3 nodes), not the map.
  await expect(page.locator('.me-tpc')).toHaveCount(4);

  await page.getByRole('button', { name: '新建子节点' }).click();
  await page.waitForTimeout(700);
  await expect(page.locator('.me-tpc')).toHaveCount(5);
  expect((await readTarget(page))?.nodes).toBe(5);

  await page.getByRole('button', { name: '撤销' }).click();
  await page.waitForTimeout(700);
  await expect(page.locator('.me-tpc')).toHaveCount(4);
  expect((await readTarget(page))?.nodes).toBe(4);

  await page.getByRole('button', { name: '完成' }).click();
  await expect(page.locator('.mode-label')).toHaveCount(0);
  await expect(page.locator('.me-tpc')).toHaveCount(2);
});

test('edits a target node note from the detail panel', async ({ page }) => {
  await seedStorage(page, SEED_WORKSPACE);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await page.waitForTimeout(800);

  await page.getByRole('button', { name: '在画布中编辑' }).click();
  await page.locator('aside.panel button', { hasText: 'HTML' }).first().click();

  const note = page.locator('aside.panel textarea');
  await note.fill('理解语义化标签与可访问性');
  await note.blur();
  await page.waitForTimeout(800);

  expect((await readTarget(page))?.root.children.find((c) => c.id === 't_html')?.note).toBe(
    '理解语义化标签与可访问性',
  );
});
