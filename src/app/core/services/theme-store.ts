import { Injectable, computed, effect, signal } from '@angular/core';

export type Theme = 'light' | 'dark';

const STORAGE_KEY = 'fp-theme';

/**
 * App-wide light/dark theme state, held as a signal.
 *
 * Toggling sets the `.theme-dark` class on <html>; the Material theme and design
 * tokens flip via CSS `color-scheme` / `light-dark()` (see styles/_theme.scss).
 * The choice is persisted and falls back to the OS preference on first visit.
 * All browser-API access is guarded so the store is safe to construct in tests.
 */
@Injectable({ providedIn: 'root' })
export class ThemeStore {
  private readonly _theme = signal<Theme>(this.readInitial());

  readonly theme = this._theme.asReadonly();
  readonly isDark = computed(() => this._theme() === 'dark');

  constructor() {
    effect(() => this.apply(this._theme()));
  }

  toggle(): void {
    this._theme.update((t) => (t === 'dark' ? 'light' : 'dark'));
  }

  set(theme: Theme): void {
    this._theme.set(theme);
  }

  private apply(theme: Theme): void {
    if (typeof document !== 'undefined') {
      const el = document.documentElement;
      el.classList.toggle('theme-dark', theme === 'dark');
      el.classList.toggle('theme-light', theme === 'light');
    }
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      // Storage unavailable (private mode / tests) — ignore.
    }
  }

  private readInitial(): Theme {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === 'dark' || saved === 'light') {
        return saved;
      }
    } catch {
      // ignore
    }
    if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'light';
  }
}
