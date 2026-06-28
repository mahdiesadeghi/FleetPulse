import { TestBed } from '@angular/core/testing';

import { ThemeStore } from './theme-store';

describe('ThemeStore', () => {
  let store: ThemeStore;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    store = TestBed.inject(ThemeStore);
  });

  it('toggles between light and dark', () => {
    store.set('light');
    expect(store.theme()).toBe('light');
    expect(store.isDark()).toBe(false);

    store.toggle();
    expect(store.theme()).toBe('dark');
    expect(store.isDark()).toBe(true);

    store.toggle();
    expect(store.theme()).toBe('light');
  });

  it('sets a specific theme', () => {
    store.set('dark');
    expect(store.theme()).toBe('dark');
  });
});
