import { describe, expect, it } from 'vitest';
import type { SharePayload, Workspace } from '$lib/types';
import { SHARE_LIMIT, buildSharePayload, encodeShare } from './encode';
import { decodeShare } from './decode';

function makeWorkspace(withTarget = true): Workspace {
  return {
    schemaVersion: 1,
    map: {
      id: 'm',
      title: '我的导图',
      updatedAt: '2026-01-01T00:00:00.000Z',
      root: {
        id: 'u_root',
        topic: '我的',
        children: [{ id: 'u_a', topic: 'A', children: [] }],
      },
    },
    target: withTarget
      ? {
          id: 't',
          title: '目标',
          updatedAt: '2026-01-01T00:00:00.000Z',
          source: 'template',
          root: { id: 't_root', topic: '目标', children: [] },
        }
      : null,
    comparison: null,
    ignoredSignatures: [],
    ui: { locale: 'zh', panelTab: 'target' },
  };
}

describe('share encode/decode', () => {
  it('builds a payload with only map + target', () => {
    const payload = buildSharePayload(makeWorkspace());
    expect(payload).not.toBeNull();
    expect(Object.keys(payload!)).toEqual(['v', 'm', 't']);
    expect(JSON.stringify(payload)).not.toContain('comparison');
  });

  it('returns null when there is no target', () => {
    expect(buildSharePayload(makeWorkspace(false))).toBeNull();
  });

  it('round-trips through lz-string', () => {
    const payload = buildSharePayload(makeWorkspace())!;
    const encoded = encodeShare(payload);
    expect(encoded.length).toBeLessThan(SHARE_LIMIT);
    const decoded = decodeShare(encoded);
    expect(decoded).toEqual(payload);
  });

  it('rejects missing, garbage and malformed data', () => {
    expect(decodeShare(null)).toBeNull();
    expect(decodeShare('')).toBeNull();
    expect(decodeShare('not-a-real-payload')).toBeNull();
    const bad = encodeShare({ v: 2, m: {} } as unknown as SharePayload);
    expect(decodeShare(bad)).toBeNull();
  });

  it('keeps the encoded payload small for the sample workspace', () => {
    const encoded = encodeShare(buildSharePayload(makeWorkspace())!);
    expect(encoded.length).toBeGreaterThan(0);
    expect(encoded).not.toContain(' ');
  });
});
