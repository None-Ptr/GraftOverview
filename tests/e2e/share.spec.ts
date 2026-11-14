import LZString from 'lz-string';
import { expect, test } from '@playwright/test';

const payload = {
  v: 1,
  m: {
    id: 'share-m',
    title: '分享的导图',
    updatedAt: '2026-01-01T00:00:00.000Z',
    root: {
      id: 's_root',
      topic: '分享的导图',
      children: [{ id: 's_a', topic: '分享节点 A', children: [] }],
    },
  },
  t: {
    id: 'share-t',
    title: '分享的目标',
    updatedAt: '2026-01-01T00:00:00.000Z',
    source: 'template',
    root: {
      id: 'st_root',
      topic: '分享的目标',
      children: [{ id: 'st_a', topic: '目标节点 A', note: '目标说明', children: [] }],
    },
  },
};

test('valid share renders a read-only canvas, expands notes, downloads, and imports', async ({
  page,
}) => {
  await page.addInitScript(() => localStorage.setItem('graft.onboarded', 'true'));
  const encoded = LZString.compressToEncodedURIComponent(JSON.stringify(payload));
  await page.goto(`/#/share?d=${encoded}`);
  await page.waitForTimeout(600);

  await expect(page.getByText('只读分享')).toBeVisible();
  await expect(page.getByText('导图（只读）')).toBeVisible();
  await expect(page.getByText('目标体系（只读）')).toBeVisible();

  // The shared map renders as a real read-only mind map.
  expect(await page.locator('.me-tpc').count()).toBeGreaterThan(1);
  await expect(page.getByText('分享节点 A')).toBeVisible();
  await expect(page.getByText('目标节点 A')).toBeVisible();

  // Expand a target node's note.
  await page.getByRole('button', { name: '目标节点 A' }).first().click();
  await expect(page.getByText('目标说明')).toBeVisible();

  // Download the share payload as JSON.
  const downloadPromise = page.waitForEvent('download', { timeout: 5000 });
  await page.getByRole('button', { name: '下载 JSON' }).click();
  expect((await downloadPromise).suggestedFilename()).toBe('graft-share.json');

  // Read-only page must not write a workspace before the user confirms.
  expect(await page.evaluate(() => localStorage.getItem('graft.workspaces.v2'))).toBeNull();

  await page.getByRole('button', { name: '导入到我的工作区' }).click();
  await page.getByRole('button', { name: '确认导入' }).click();
  await page.waitForTimeout(800);

  await expect(page.locator('aside.panel')).toBeVisible();
  await expect(page.locator('.doc-title')).toContainText('分享的导图');
});

test('share page never exposes an api key', async ({ page }) => {
  const encoded = LZString.compressToEncodedURIComponent(JSON.stringify(payload));
  await page.goto(`/#/share?d=${encoded}`);
  const html = await page.content();
  expect(html).not.toContain('test-key');
  expect(html).not.toContain('apiKey');
});
