import { expect, test } from '@playwright/test';
import { seedStorage } from './helpers';

const WORKSPACE = {
  schemaVersion: 1,
  map: {
    id: 'm',
    title: '我的导图',
    updatedAt: '2026-01-01T00:00:00.000Z',
    root: {
      id: 'u_root',
      topic: '我的知识',
      children: [
        { id: 'u_a', topic: 'A', children: [] },
        { id: 'u_b', topic: 'B', children: [] },
      ],
    },
  },
  target: null,
  comparison: null,
  ignoredSignatures: [],
  ui: { locale: 'zh', panelTab: 'target' },
};

const canvasTransform = (page: import('@playwright/test').Page) =>
  page.evaluate(
    () =>
      (document.querySelector('.map-container .map-canvas') as HTMLElement | null)?.style
        .transform ?? null,
  );

async function drag(
  page: import('@playwright/test').Page,
  from: { x: number; y: number },
  to: { x: number; y: number },
) {
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move((from.x + to.x) / 2, (from.y + to.y) / 2, { steps: 8 });
  await page.mouse.move(to.x, to.y, { steps: 8 });
  await page.mouse.up();
  await page.waitForTimeout(250);
}

test('left-drag on the canvas background pans the map', async ({ page }) => {
  await seedStorage(page, WORKSPACE);
  await page.goto('/');
  await page.waitForTimeout(700);

  const box = await page.locator('.map-container').boundingBox();
  expect(box).not.toBeNull();

  const before = await canvasTransform(page);
  expect(before).not.toBeNull();
  // Start in the empty upper-right area, away from the floating toolbar.
  await drag(
    page,
    { x: box!.x + box!.width - 60, y: box!.y + 80 },
    { x: box!.x + box!.width - 200, y: box!.y + 180 },
  );
  const after = await canvasTransform(page);

  expect(after).not.toBe(before);
});

test('dragging a node re-parents it without panning the canvas', async ({ page }) => {
  await seedStorage(page, WORKSPACE);
  await page.goto('/');
  await page.waitForTimeout(700);

  const nodeA = await page.locator('.me-tpc[data-nodeid="meu_a"]').boundingBox();
  const nodeB = await page.locator('.me-tpc[data-nodeid="meu_b"]').boundingBox();
  expect(nodeA && nodeB).toBeTruthy();

  const before = await canvasTransform(page);
  await drag(
    page,
    { x: nodeB!.x + nodeB!.width / 2, y: nodeB!.y + nodeB!.height / 2 },
    { x: nodeA!.x + nodeA!.width / 2, y: nodeA!.y + nodeA!.height / 2 },
  );
  await page.waitForTimeout(400);

  const after = await canvasTransform(page);
  expect(after).toBe(before);

  const map = (await page.evaluate(() => {
    const index = JSON.parse(localStorage.getItem('graft.workspaces.v2') ?? '{}') as {
      activeId: string;
    };
    const raw = localStorage.getItem(`graft.workspace.v2.${index.activeId}`);
    return raw ? JSON.parse(raw).map : null;
  })) as { root: { children: { id: string; children: { id: string }[] }[] } } | null;

  const rootChildren = map?.root.children ?? [];
  expect(rootChildren.map((node) => node.id)).toEqual(['u_a']);
  expect(rootChildren[0].children.map((node) => node.id)).toEqual(['u_b']);
});
