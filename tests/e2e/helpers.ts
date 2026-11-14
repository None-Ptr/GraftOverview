import type { Page } from '@playwright/test';

export const SEED_WORKSPACE = {
  schemaVersion: 1,
  map: {
    id: 'm',
    title: '我的导图',
    updatedAt: '2026-01-01T00:00:00.000Z',
    root: {
      id: 'u_root',
      topic: '我的知识',
      children: [{ id: 'u_html', topic: 'HTML', children: [] }],
    },
  },
  target: {
    id: 't',
    title: '前端目标',
    updatedAt: '2026-01-01T00:00:00.000Z',
    source: 'template',
    root: {
      id: 't_root',
      topic: '前端开发',
      children: [
        { id: 't_html', topic: 'HTML', children: [] },
        {
          id: 't_eng',
          topic: '工程化',
          children: [{ id: 't_vite', topic: 'Vite', children: [] }],
        },
      ],
    },
  },
  comparison: null,
  ignoredSignatures: [],
  ui: { locale: 'zh', panelTab: 'target' },
};

export async function readActiveWorkspace(page: Page): Promise<unknown> {
  return page.evaluate(() => {
    const indexRaw = localStorage.getItem('graft.workspaces.v2');
    if (!indexRaw) return null;
    const index = JSON.parse(indexRaw) as { activeId?: string | null };
    if (!index.activeId) return null;
    const raw = localStorage.getItem(`graft.workspace.v2.${index.activeId}`);
    return raw ? JSON.parse(raw) : null;
  });
}

export async function seedStorage(
  page: Page,
  workspace: unknown = SEED_WORKSPACE,
  theme: 'light' | 'dark' = 'light',
  onboarded = true,
): Promise<void> {
  await page.addInitScript(
    (payload) => {
      const ws = payload.workspace as {
        map: { id: string; title: string; updatedAt: string };
      };
      localStorage.setItem(
        'graft.workspaces.v2',
        JSON.stringify({
          schemaVersion: 2,
          activeId: ws.map.id,
          items: [{ id: ws.map.id, title: ws.map.title, updatedAt: ws.map.updatedAt }],
        }),
      );
      localStorage.setItem(`graft.workspace.v2.${ws.map.id}`, JSON.stringify(payload.workspace));
      localStorage.setItem(
        'graft.llm.v1',
        JSON.stringify({
          schemaVersion: 1,
          presetId: 'custom',
          baseUrl: 'http://127.0.0.1:4173/v1',
          apiKey: 'test-key',
          model: 'mock-model',
          temperature: 0.2,
          maxTokens: 4096,
          jsonMode: true,
        }),
      );
      localStorage.setItem('graft.consent.v1', 'true');
      localStorage.setItem('graft.theme', payload.theme);
      if (payload.onboarded) localStorage.setItem('graft.onboarded', 'true');
      else localStorage.removeItem('graft.onboarded');
    },
    { workspace, theme, onboarded },
  );
}

/** Deterministic OpenAI-compatible mock: match by topic, gap every unmatched non-root target node. */
export async function mockComparisonEndpoint(page: Page): Promise<void> {
  await page.route('**/v1/chat/completions', async (route) => {
    const body = JSON.parse(route.request().postData() ?? '{}') as {
      messages?: { content: string }[];
    };
    const prompt = (body.messages ?? []).map((message) => message.content).join('\n');
    const targetBlock = /<TARGET>([\s\S]*?)<\/TARGET>/.exec(prompt)?.[1] ?? '';
    const userBlock = /<USER>([\s\S]*?)<\/USER>/.exec(prompt)?.[1] ?? '';
    const parse = (block: string): { id: string; depth: number; topic: string }[] =>
      block
        .trim()
        .split('\n')
        .filter(Boolean)
        .map((line) => {
          const [id, depth, topic] = line.split('|');
          return { id, depth: Number(depth), topic };
        });
    const target = parse(targetBlock);
    const user = parse(userBlock);
    const userByTopic = new Map(user.map((node) => [node.topic.toLowerCase(), node.id]));
    const matches: { targetId: string; userNodeId: string; confidence: number }[] = [];
    const gaps: Record<string, unknown>[] = [];
    for (const node of target) {
      const hit = userByTopic.get(node.topic.toLowerCase());
      if (hit) matches.push({ targetId: node.id, userNodeId: hit, confidence: 0.9 });
      else if (node.depth > 0) {
        gaps.push({
          targetId: node.id,
          suggestedUserParentId: user[0]?.id ?? null,
          reason: `缺少 ${node.topic} 的完整链路。`,
          selfCheck: ['能解释它解决什么问题吗？'],
          links: [],
          priority: 'high',
        });
      }
    }
    const content = JSON.stringify({ matches, gaps, extras: [] });
    await route.fulfill({
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ choices: [{ message: { content }, finish_reason: 'stop' }] }),
    });
  });
}
