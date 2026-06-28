import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { catchError, of, switchMap, tap } from 'rxjs';

import { Alert, AlertQuery, AlertSeverity, Site } from '@core/models';
import { AlertApi } from '@core/services/alert-api';
import { SiteApi } from '@core/services/site-api';

export type AckFilter = 'all' | 'open' | 'acknowledged';

/** Store for the fleet-wide alert feed: filters, results and the ack action. */
@Injectable()
export class AlertsStore {
  private readonly alertApi = inject(AlertApi);
  private readonly siteApi = inject(SiteApi);
  private readonly destroyRef = inject(DestroyRef);

  readonly severity = signal<AlertSeverity | ''>('');
  readonly siteId = signal('');
  readonly ackState = signal<AckFilter>('all');
  readonly sites = signal<Site[]>([]);

  private readonly _alerts = signal<Alert[]>([]);
  private readonly _loading = signal(true);
  private readonly _error = signal<string | null>(null);

  readonly alerts = this._alerts.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();
  readonly openCount = computed(() => this._alerts().filter((a) => !a.acknowledged).length);
  readonly hasActiveFilters = computed(
    () => !!this.severity() || !!this.siteId() || this.ackState() !== 'all',
  );

  private readonly query = computed<AlertQuery>(() => ({
    severity: this.severity() || undefined,
    siteId: this.siteId() || undefined,
    acknowledged: this.ackState() === 'all' ? undefined : this.ackState() === 'acknowledged',
  }));

  constructor() {
    this.loadSites();

    toObservable(this.query)
      .pipe(
        tap(() => {
          this._loading.set(true);
          this._error.set(null);
        }),
        switchMap((q) =>
          this.alertApi.getAlerts(q).pipe(
            catchError(() => {
              this._error.set('Failed to load alerts.');
              return of<Alert[]>([]);
            }),
          ),
        ),
        takeUntilDestroyed(),
      )
      .subscribe((alerts) => {
        this._alerts.set(alerts);
        this._loading.set(false);
      });
  }

  acknowledge(id: string): void {
    this.alertApi
      .acknowledge(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((updated) => {
        // If we're viewing open-only alerts, drop the acked one; otherwise update it.
        if (this.ackState() === 'open') {
          this._alerts.update((list) => list.filter((a) => a.id !== updated.id));
        } else {
          this._alerts.update((list) => list.map((a) => (a.id === updated.id ? updated : a)));
        }
      });
  }

  clearFilters(): void {
    this.severity.set('');
    this.siteId.set('');
    this.ackState.set('all');
  }

  private loadSites(): void {
    this.siteApi
      .getSites()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({ next: (sites) => this.sites.set(sites) });
  }
}
