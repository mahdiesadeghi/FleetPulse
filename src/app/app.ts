import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';

import { ThemeStore } from '@core/services/theme-store';

interface NavItem {
  path: string;
  label: string;
  icon: string;
}

/**
 * Application shell: persistent sidebar + top bar that frame every routed view.
 * The sidebar is always visible on desktop and becomes an overlay drawer on
 * small screens. Theme toggling and the current-page label live here.
 */
@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  protected readonly theme = inject(ThemeStore);
  private readonly router = inject(Router);

  protected readonly navItems: readonly NavItem[] = [
    { path: '/overview', label: 'Overview', icon: 'dashboard' },
    { path: '/devices', label: 'Devices', icon: 'memory' },
    { path: '/air-quality', label: 'Air Quality', icon: 'air' },
    { path: '/alerts', label: 'Alerts', icon: 'notifications' },
  ];

  protected readonly navOpen = signal(false);
  private readonly url = signal(this.router.url);

  protected readonly pageTitle = computed(() => this.labelFor(this.url()));

  constructor() {
    this.router.events
      .pipe(
        filter((e): e is NavigationEnd => e instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe((e) => this.url.set(e.urlAfterRedirects));
  }

  protected toggleNav(): void {
    this.navOpen.update((open) => !open);
  }

  protected closeNav(): void {
    this.navOpen.set(false);
  }

  private labelFor(url: string): string {
    if (url.startsWith('/devices/')) {
      return 'Device detail';
    }
    const match = this.navItems.find((i) => url.startsWith(i.path));
    return match?.label ?? 'FleetPulse';
  }
}
