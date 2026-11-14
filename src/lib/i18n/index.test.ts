import { describe, expect, it } from 'vitest';
import { en, t, zh, type MessageKey } from './index';
import { setLocale } from './index';

describe('i18n', () => {
  it('en has exactly the same keys as zh', () => {
    const zhKeys = Object.keys(zh).sort();
    const enKeys = Object.keys(en).sort();
    expect(enKeys).toEqual(zhKeys);
  });

  it('interpolates named params', () => {
    expect(t('common.savedAt', { time: '14:32' })).toBe('已保存 14:32');
    expect(t('suggest.coverageMeta', { target: 84, covered: 52, missing: 12 })).toContain('84');
  });

  it('switches locale', () => {
    setLocale('en');
    expect(t('common.save')).toBe('Save');
    setLocale('zh');
    expect(t('common.save')).toBe('保存');
  });

  it('every key resolves to a non-empty string in both locales', () => {
    const keys = Object.keys(zh) as MessageKey[];
    for (const key of keys) {
      expect(zh[key].length).toBeGreaterThan(0);
      expect(en[key].length).toBeGreaterThan(0);
    }
  });

  it('English copy contains no CJK except the Chinese language label', () => {
    const cjk = /[\u3400-\u9fff\uf900-\ufaff]/;
    const offenders = (Object.keys(en) as MessageKey[]).filter(
      (key) => key !== 'common.zh' && cjk.test(en[key]),
    );
    expect(offenders).toEqual([]);
  });

  it('has no leftover placeholders or untrimmed copy', () => {
    for (const table of [zh, en]) {
      for (const value of Object.values(table)) {
        expect(value).not.toMatch(/TODO|FIXME|XXX/);
        expect(value).toBe(value.trim());
        // Multi-line placeholders (outline examples) legitimately carry indentation.
        if (!value.includes('\n')) expect(value).not.toMatch(/\s{2,}/);
      }
    }
  });

  it('keeps identical product names and punctuation across locales', () => {
    expect(zh['common.appName']).toBe(en['common.appName']);
    expect(zh['common.appName']).toBe('GraftOverview');
  });
});
