import type { MessageKey } from '$lib/i18n';

export interface Preset {
  id: string;
  labelKey: MessageKey;
  baseUrl: string;
  model: string;
  jsonMode: boolean;
}

/**
 * Defaults only — model names change, and the UI lets the user edit every field.
 * No "latest" / "best" claims anywhere (§4.2).
 */
export const PRESETS: Preset[] = [
  {
    id: 'openai',
    labelKey: 'settings.preset.openai',
    baseUrl: 'https://api.openai.com/v1',
    model: 'gpt-4o-mini',
    jsonMode: true,
  },
  {
    id: 'deepseek',
    labelKey: 'settings.preset.deepseek',
    baseUrl: 'https://api.deepseek.com/v1',
    model: 'deepseek-chat',
    jsonMode: true,
  },
  {
    id: 'siliconflow',
    labelKey: 'settings.preset.siliconflow',
    baseUrl: 'https://api.siliconflow.cn/v1',
    model: 'Qwen/Qwen2.5-72B-Instruct',
    jsonMode: true,
  },
  {
    id: 'ollama',
    labelKey: 'settings.preset.ollama',
    baseUrl: 'http://localhost:11434/v1',
    model: 'qwen2.5:7b',
    jsonMode: false,
  },
  {
    id: 'custom',
    labelKey: 'settings.preset.custom',
    baseUrl: '',
    model: '',
    jsonMode: false,
  },
];

export function getPreset(id: string): Preset | undefined {
  return PRESETS.find((preset) => preset.id === id);
}
