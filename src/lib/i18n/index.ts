import type { Locale } from '../types';
import { i18nState } from './state.svelte';
import { commonZh, commonEn } from './common';
import { mapZh, mapEn } from './map';
import { targetZh, targetEn } from './target';
import { compareZh, compareEn } from './compare';
import { settingsZh, settingsEn } from './settings';
import { errorsZh, errorsEn } from './errors';
import { suggestZh, suggestEn } from './suggest';
import { historyZh, historyEn } from './history';
import { shareZh, shareEn } from './share';
import { workspaceZh, workspaceEn } from './workspace';
import { packsZh, packsEn } from './packs';
import { sessionZh, sessionEn } from './session';

export const zh = {
  ...commonZh,
  ...mapZh,
  ...targetZh,
  ...compareZh,
  ...settingsZh,
  ...errorsZh,
  ...suggestZh,
  ...historyZh,
  ...shareZh,
  ...workspaceZh,
  ...packsZh,
  ...sessionZh,
} as const;

export type MessageKey = keyof typeof zh;

/** `en` is type-checked against zh keys — a missing key is a compile error. */
export const en: Record<MessageKey, string> = {
  ...commonEn,
  ...mapEn,
  ...targetEn,
  ...compareEn,
  ...settingsEn,
  ...errorsEn,
  ...suggestEn,
  ...historyEn,
  ...shareEn,
  ...workspaceEn,
  ...packsEn,
  ...sessionEn,
};

const tables: Record<Locale, Record<MessageKey, string>> = { zh, en };

export type TParams = Record<string, string | number>;

export function t(key: MessageKey, params?: TParams): string {
  let text: string = tables[i18nState.locale]?.[key] ?? zh[key] ?? key;
  if (text === key && import.meta.env.DEV) {
    // Missing key: report in dev, fall back to zh in production.
    console.error(`[i18n] missing key: ${key}`);
  }
  if (params) {
    for (const [name, value] of Object.entries(params)) {
      text = text.replaceAll(`{${name}}`, String(value));
    }
  }
  return text;
}

export function currentLocale(): Locale {
  return i18nState.locale;
}

export function setLocale(locale: Locale): void {
  i18nState.locale = locale;
}

export function localeLabel(locale: Locale): string {
  return locale === 'zh' ? zh['common.zh'] : zh['common.en'];
}

export { i18nState };
