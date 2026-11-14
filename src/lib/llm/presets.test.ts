import { describe, expect, it } from 'vitest';
import { PRESETS, getPreset } from './presets';

describe('presets', () => {
  it('ships the 5 documented presets in order', () => {
    expect(PRESETS.map((p) => p.id)).toEqual([
      'openai',
      'deepseek',
      'siliconflow',
      'ollama',
      'custom',
    ]);
  });

  it('has the documented default base urls and models', () => {
    expect(getPreset('openai')).toMatchObject({
      baseUrl: 'https://api.openai.com/v1',
      model: 'gpt-4o-mini',
      jsonMode: true,
    });
    expect(getPreset('ollama')).toMatchObject({
      baseUrl: 'http://localhost:11434/v1',
      model: 'qwen2.5:7b',
      jsonMode: false,
    });
    expect(getPreset('custom')?.baseUrl).toBe('');
  });

  it('never makes marketing claims about models', () => {
    const text = JSON.stringify(PRESETS).toLowerCase();
    for (const word of ['latest', 'best', 'state-of-the-art', '最新', '最强']) {
      expect(text).not.toContain(word);
    }
  });

  it('returns undefined for an unknown id', () => {
    expect(getPreset('nope')).toBeUndefined();
  });
});
