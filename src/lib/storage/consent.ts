import { STORAGE_KEYS } from './keys';

function storage(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

/** First-compare data-egress consent (§4.7). Stored separately from LLM settings. */
export function loadConsent(): boolean {
  const s = storage();
  if (!s) return false;
  try {
    return s.getItem(STORAGE_KEYS.consent) === 'true';
  } catch {
    return false;
  }
}

export function saveConsent(value: boolean): void {
  const s = storage();
  if (!s) return;
  s.setItem(STORAGE_KEYS.consent, value ? 'true' : 'false');
}

/** First-run guide completion flag (separate from data-egress consent). */
export function loadOnboarded(): boolean {
  const s = storage();
  if (!s) return true; // no storage (SSR/test) -> don't nag
  try {
    return s.getItem(STORAGE_KEYS.onboarded) === 'true';
  } catch {
    return true;
  }
}

export function saveOnboarded(): void {
  const s = storage();
  if (!s) return;
  s.setItem(STORAGE_KEYS.onboarded, 'true');
}
