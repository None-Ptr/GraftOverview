import type { ThemeMode } from '../types';
import { loadTheme, saveTheme } from '../storage/theme';

export type ResolvedTheme = 'light' | 'dark';

class ThemeStore {
  mode = $state<ThemeMode>('system');
  resolved = $state<ResolvedTheme>('light');
  private bound = false;

  init(): void {
    if (typeof window === 'undefined') return;
    this.mode = loadTheme();
    this.apply();
    if (!this.bound) {
      this.bound = true;
      const mq = window.matchMedia('(prefers-color-scheme: dark)');
      mq.addEventListener('change', () => {
        if (this.mode === 'system') this.apply();
      });
    }
  }

  apply(): void {
    if (typeof document === 'undefined') return;
    const prefersDark =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-color-scheme: dark)').matches;
    const dark = this.mode === 'dark' || (this.mode === 'system' && prefersDark);
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
    this.resolved = dark ? 'dark' : 'light';
  }

  set(mode: ThemeMode): void {
    this.mode = mode;
    saveTheme(mode);
    this.apply();
  }
}

export const theme = new ThemeStore();
