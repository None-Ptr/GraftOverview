import type { Locale } from '../types';

/** Reactive locale holder. Components reading `i18nState.locale` re-render on change. */
export const i18nState = $state<{ locale: Locale }>({ locale: 'zh' });
