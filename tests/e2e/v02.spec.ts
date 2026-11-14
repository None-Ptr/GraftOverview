import { expect, test } from '@playwright/test';
import { SEED_WORKSPACE, mockComparisonEndpoint, readActiveWorkspace, seedStorage } from './helpers';

interface PersistedComparison {
  stats: { targetNodes: number };
  gaps: { topic: string }[];
}

async function persistedComparison(
  page: import('@playwright/test').Page,
): Promise<PersistedComparison | null> {
  const workspace = (await readActiveWorkspace(page)) as {
    comparison: PersistedComparison | null;
  } | null;
  return workspace?.comparison ?? null;
}

test('first run shows the onboarding guide once', async ({ page }) => {
  await seedStorage(page, SEED_WORKSPACE, 'light', false);
  await page.goto('/');
  const start = page.getByRole('button', { name: '开始使用' });
  await expect(start).toBeVisible();
  await start.click();
  await expect(page.locator('dialog[open]')).toHaveCount(0);
  expect(await page.evaluate(() => localStorage.getItem('graft.onboarded'))).toBe('true');
});

test('Ctrl+K opens the command palette and runs a command', async ({ page }) => {
  await seedStorage(page);
  await page.goto('/');
  await page.waitForTimeout(400);

  await page.keyboard.press('Control+K');
  const input = page.getByPlaceholder('输入命令…');
  await expect(input).toBeVisible();
  await input.fill('导出');
  await page.waitForTimeout(150);
  await page.keyboard.press('Enter');
  await expect(page.locator('dialog[open]')).toContainText('导出');
});

test('target picker lists 8 templates', async ({ page }) => {
  await seedStorage(page, { ...SEED_WORKSPACE, target: null });
  await page.goto('/');
  await page.waitForTimeout(400);
  await page.getByRole('button', { name: '内置模板' }).first().click();
  await expect(page.locator('dialog[open] .card')).toHaveCount(8);
});

test('a target over 400 nodes asks for a branch, then scopes the comparison', async ({ page }) => {
  const bigTarget = {
    ...SEED_WORKSPACE.target,
    root: {
      id: 't_root',
      topic: '超大目标',
      children: Array.from({ length: 401 }, (_, i) => ({
        id: `tb${i}`,
        topic: `分支 ${i}`,
        children: [{ id: `tb${i}c`, topic: `节点 ${i}`, children: [] }],
      })),
    },
  };
  await seedStorage(page, { ...SEED_WORKSPACE, target: bigTarget });
  await mockComparisonEndpoint(page);
  await page.goto('/');
  await page.waitForTimeout(500);
  await page.getByRole('button', { name: /开始对比/ }).first().click();
  await expect(page.locator('dialog[open]')).toContainText('选择要对比的分支');

  await page.locator('dialog[open]').getByRole('button', { name: '分支 0' }).first().click();
  await page.waitForTimeout(1800);
  const comparison = await persistedComparison(page);
  expect(comparison?.stats.targetNodes).toBe(2);
});

test('chunked comparison merges per-branch results', async ({ page }) => {
  const perBranch = 40;
  const bigTarget = {
    ...SEED_WORKSPACE.target,
    root: {
      id: 't_root',
      topic: '大目标',
      children: Array.from({ length: 4 }, (_, b) => ({
        id: `b${b}`,
        topic: `分支${b}`,
        children: Array.from({ length: perBranch }, (_, c) => ({
          id: `b${b}c${c}`,
          topic: `节点${b}-${c}`,
          children: [],
        })),
      })),
    },
  };
  await seedStorage(page, { ...SEED_WORKSPACE, target: bigTarget });
  await mockComparisonEndpoint(page);
  await page.goto('/');
  await page.waitForTimeout(600);
  await page.getByRole('button', { name: /开始对比/ }).first().click();
  await page.waitForTimeout(2800);

  const comparison = await persistedComparison(page);
  expect(comparison).not.toBeNull();
  const data = comparison!;
  expect(data.stats.targetNodes).toBe(165);
  // 4 branches × 40 children, all merged across the per-branch requests.
  expect(data.gaps.length).toBe(160);
  const topics = data.gaps.map((gap) => gap.topic);
  expect(topics).toContain('节点0-0');
  expect(topics).toContain('节点3-39');
});
