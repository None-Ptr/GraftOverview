import { expect, test } from '@playwright/test';
import { SEED_WORKSPACE, mockComparisonEndpoint, seedStorage } from './helpers';

const NOTES_WORKSPACE = {
  ...SEED_WORKSPACE,
  target: {
    ...SEED_WORKSPACE.target,
    root: {
      id: 't_root',
      topic: '前端开发',
      children: [
        { id: 't_html', topic: 'HTML', note: '理解语义化标签与可访问性', children: [] },
        { id: 't_eng', topic: '工程化', note: '掌握构建与部署流程', children: [] },
      ],
    },
  },
};

function countCompletions(page: import('@playwright/test').Page) {
  const state = { calls: 0, bodies: [] as string[] };
  page.on('request', (request) => {
    if (!request.url().includes('/chat/completions')) return;
    state.calls += 1;
    state.bodies.push(request.postData() ?? '');
  });
  return state;
}

async function waitForComparison(page: import('@playwright/test').Page): Promise<void> {
  await expect
    .poll(
      () =>
        page.evaluate(() => {
          const index = JSON.parse(localStorage.getItem('graft.workspaces.v2') ?? '{}') as {
            activeId?: string;
          };
          if (!index.activeId) return 0;
          const raw = localStorage.getItem(`graft.workspace.v2.${index.activeId}`);
          return raw ? (JSON.parse(raw).comparison?.gaps?.length ?? 0) : 0;
        }),
      { timeout: 15_000 },
    )
    .toBeGreaterThan(0);
}

test('the compare entry shows a token estimate', async ({ page }) => {
  await seedStorage(page, SEED_WORKSPACE);
  await page.goto('/');
  await page.waitForTimeout(600);

  const cost = page.locator('.compare .cost');
  await expect(cost).toBeVisible();
  await expect(cost).toContainText('≈');
  await expect(cost).toContainText('tokens');
});

test('comparing twice reuses the result without another request', async ({ page }) => {
  await seedStorage(page, SEED_WORKSPACE);
  await mockComparisonEndpoint(page);
  const calls = countCompletions(page);

  await page.goto('/');
  await page.waitForTimeout(600);
  await page.getByRole('button', { name: /开始对比/ }).click();
  await waitForComparison(page);
  // The mock omits the root id, so the client runs one coverage repair.
  const callsAfterFirst = calls.calls;
  expect(callsAfterFirst).toBeGreaterThan(0);

  // Nothing changed: reuse the stored result instead of paying again.
  await expect(page.locator('.compare .cost')).toContainText('已是最新');
  await page.getByRole('button', { name: /开始对比/ }).click();
  await expect(page.locator('.toast', { hasText: '内容未变化' })).toBeVisible({ timeout: 8_000 });
  await page.waitForTimeout(600);
  expect(calls.calls).toBe(callsAfterFirst);
});

test('compact mode omits target notes from the request', async ({ page }) => {
  await seedStorage(page, NOTES_WORKSPACE);
  await mockComparisonEndpoint(page);
  await page.addInitScript(() => {
    const raw = localStorage.getItem('graft.llm.v1');
    if (!raw) return;
    const settings = JSON.parse(raw) as Record<string, unknown>;
    settings.compactPrompt = true;
    localStorage.setItem('graft.llm.v1', JSON.stringify(settings));
  });
  const calls = countCompletions(page);

  await page.goto('/');
  await page.waitForTimeout(600);
  await page.getByRole('button', { name: /开始对比/ }).click();
  await waitForComparison(page);

  expect(calls.calls).toBeGreaterThan(0);
  for (const body of calls.bodies) {
    expect(body).not.toContain('理解语义化标签与可访问性');
    expect(body).toContain('HTML');
  }
});
