import type { ThemeMode } from '../types';
import { STORAGE_KEYS } from './keys';

function storage(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

function isThemeMode(value: string | null): value is ThemeMode {
  return value === 'light' || value === 'dark' || value === 'system';
}

export function loadTheme(): ThemeMode {
  const s = storage();
  if (!s) return 'system';
  try {
    const raw = s.getItem(STORAGE_KEYS.theme);
    return isThemeMode(raw) ? raw : 'system';
  } catch {
    return 'system';
  }
}

export function saveTheme(mode: ThemeMode): void {
  const s = storage();
  if (!s) return;
  s.setItem(STORAGE_KEYS.theme, mode);
}
