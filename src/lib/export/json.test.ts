import { describe, expect, it } from 'vitest';
import type { Workspace } from '$lib/types';
import { parseProject, serializeProject } from './json';

function makeWorkspace(): Workspace {
  return {
    schemaVersion: 1,
    map: {
      id: 'm',
      title: '我的导图',
      updatedAt: '2026-01-01T00:00:00.000Z',
      root: { id: 'u_root', topic: '我的', children: [] },
    },
    target: {
      id: 't',
      title: '目标',
      updatedAt: '2026-01-01T00:00:00.000Z',
      source: 'template',
      root: { id: 't_root', topic: '目标', children: [] },
    },
    comparison: null,
    ignoredSignatures: ['sig-1'],
    ui: { locale: 'zh', panelTab: 'target' },
  };
}

describe('project json', () => {
  it('round-trips a workspace with the documented envelope', () => {
    const workspace = makeWorkspace();
    const raw = serializeProject(workspace);
    const file = JSON.parse(raw) as Record<string, unknown>;
    expect(file.app).toBe('GraftOverview');
    expect(file.schemaVersion).toBe(1);
    expect(typeof file.exportedAt).toBe('string');

    const parsed = parseProject(raw);
    expect(parsed.ok).toBe(true);
    if (parsed.ok) expect(parsed.workspace).toEqual(workspace);
  });

  it('never includes an API key', () => {
    const raw = serializeProject(makeWorkspace());
    expect(raw).not.toContain('apiKey');
    expect(raw).not.toContain('api_key');
  });

  it('rejects garbage and wrong apps', () => {
    expect(parseProject('not json')).toEqual({ ok: false, reason: 'invalid' });
    expect(parseProject(JSON.stringify({ app: 'Other' }))).toEqual({ ok: false, reason: 'invalid' });
    expect(parseProject(JSON.stringify({ app: 'GraftOverview', schemaVersion: 1 }))).toEqual({
      ok: false,
      reason: 'invalid',
    });
  });

  it('reports future versions', () => {
    const raw = JSON.stringify({
      app: 'GraftOverview',
      schemaVersion: 2,
      workspace: makeWorkspace(),
    });
    expect(parseProject(raw)).toEqual({ ok: false, reason: 'future-version' });
  });
});
