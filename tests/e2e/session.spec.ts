import { expect, test } from '@playwright/test';
import { SEED_WORKSPACE, mockComparisonEndpoint, seedStorage } from './helpers';

const SESSION_WORKSPACE = {
  ...SEED_WORKSPACE,
  session: {
    id: 'sess1',
    mode: 'test',
    status: 'active',
    startedAt: '2026-01-01T00:00:00.000Z',
    submittedAt: null,
    targetSnapshot: SEED_WORKSPACE.target,
    attempt: {
      id: 'attempt1',
      title: '前端目标',
      updatedAt: '2026-01-01T00:00:00.000Z',
      root: {
        id: 'a_root',
        topic: '前端开发',
        children: [{ id: 'a_html', topic: 'HTML', children: [] }],
      },
    },
    resultId: null,
  },
  sessions: [] as unknown[],
};

test('submits a closed-book test, reviews it, and projects mastery', async ({ page }) => {
  await seedStorage(page, SESSION_WORKSPACE);
  await mockComparisonEndpoint(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await page.waitForTimeout(800);

  await expect(page.locator('.bar')).toContainText('闭卷测试');
  await expect(page.locator('aside.panel')).toContainText('闭卷测试进行中');

  await page.getByRole('button', { name: '提交测试' }).click();
  await expect(page.locator('dialog[open]')).toContainText('测试结果', { timeout: 15_000 });
  await expect(page.locator('dialog[open]')).toContainText('覆盖率');

  await page.getByRole('button', { name: '替换原图' }).click();
  await expect(page.locator('.bar')).toHaveCount(0);

  // Mastery is projected onto the target tree: HTML is mastered; root and gaps are unset.
  await expect(page.locator('.dot.m-mastered')).toHaveCount(1);
  await expect(page.locator('.dot.m-unset')).toHaveCount(3);
  await page.locator('aside.panel button', { hasText: 'HTML' }).first().click();
  await expect(page.locator('aside.panel')).toContainText('已掌握');
  await expect(page.locator('aside.panel')).toContainText('90%');
});

test('marks the mastery verdict on the target canvas', async ({ page }) => {
  await seedStorage(page, SESSION_WORKSPACE);
  await mockComparisonEndpoint(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await page.waitForTimeout(800);

  await page.getByRole('button', { name: '提交测试' }).click();
  await expect(page.locator('dialog[open]')).toContainText('测试结果', { timeout: 15_000 });
  await page.getByRole('button', { name: '替换原图' }).click();
  await page.waitForTimeout(500);

  await page.getByRole('button', { name: '在画布中编辑' }).click();
  await page.waitForTimeout(900);

  await expect(page.locator('.me-tpc[data-mastery="mastered"]')).toHaveCount(1);
  await expect(page.locator('.me-tpc[data-mastery="unset"]')).toHaveCount(3);
  await expect(page.locator('.me-tpc[data-mastery="mastered"]')).toHaveAttribute(
    'data-confidence',
    '90',
  );
});

test('starts a closed-book session and can abandon it', async ({ page }) => {
  await seedStorage(page, SEED_WORKSPACE);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await page.waitForTimeout(800);

  await page.getByRole('button', { name: '开始测试' }).click();
  await expect(page.locator('dialog[open]')).toContainText('选择测试方式');
  await page.getByRole('button', { name: '闭卷测试' }).click();
  await page.waitForTimeout(500);

  await expect(page.locator('.bar')).toContainText('闭卷测试');
  await expect(page.locator('.me-tpc')).toHaveCount(1);

  await page.getByRole('button', { name: '放弃' }).click();
  await expect(page.locator('.bar')).toHaveCount(0);
  await expect(page.locator('.me-tpc')).toHaveCount(2);
});

test('practice keeps the target visible and writes nothing', async ({ page }) => {
  await seedStorage(page, SEED_WORKSPACE);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await page.waitForTimeout(800);

  await page.getByRole('button', { name: '开始测试' }).click();
  await page.getByRole('button', { name: '练习' }).click();
  await page.waitForTimeout(500);

  await expect(page.locator('.bar')).toContainText('练习');
  await expect(page.locator('aside.panel')).toContainText('前端开发');
  await expect(page.locator('aside.panel')).not.toContainText('闭卷测试进行中');
});
