import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { catchError, filter, of, switchMap, tap } from 'rxjs';

import { Site, SiteAqHistory, TimeRange } from '@core/models';
import { SiteApi } from '@core/services/site-api';

/** Store for the air-quality view: the site list plus the selected site's
 *  history (reloaded when the selection or time-range changes). */
@Injectable()
export class AirQualityStore {
  private readonly siteApi = inject(SiteApi);
  private readonly destroyRef = inject(DestroyRef);

  readonly sites = signal<Site[]>([]);
  readonly selectedSiteId = signal('');
  readonly range = signal<TimeRange>('24h');

  private readonly _loadingSites = signal(true);
  private readonly _error = signal<string | null>(null);
  private readonly _history = signal<SiteAqHistory | null>(null);
  private readonly _historyLoading = signal(true);

  readonly loadingSites = this._loadingSites.asReadonly();
  readonly error = this._error.asReadonly();
  readonly history = this._history.asReadonly();
  readonly historyLoading = this._historyLoading.asReadonly();
  readonly selected = computed(
    () => this.sites().find((s) => s.id === this.selectedSiteId()) ?? null,
  );

  constructor() {
    this.siteApi
      .getSites()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (sites) => {
          this.sites.set(sites);
          this._loadingSites.set(false);
          if (sites.length && !this.selectedSiteId()) {
            this.selectedSiteId.set(sites[0].id);
          }
        },
        error: () => {
          this._error.set('Failed to load sites.');
          this._loadingSites.set(false);
        },
      });

    toObservable(computed(() => ({ id: this.selectedSiteId(), range: this.range() })))
      .pipe(
        filter((key) => !!key.id),
        tap(() => this._historyLoading.set(true)),
        switchMap((key) =>
          this.siteApi.getAirQualityHistory(key.id, key.range).pipe(catchError(() => of(null))),
        ),
        takeUntilDestroyed(),
      )
      .subscribe((history) => {
        this._history.set(history);
        this._historyLoading.set(false);
      });
  }

  select(siteId: string): void {
    this.selectedSiteId.set(siteId);
  }

  setRange(range: TimeRange): void {
    this.range.set(range);
  }
}
