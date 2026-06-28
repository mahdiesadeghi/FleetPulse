import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { catchError, debounceTime, of, switchMap, tap } from 'rxjs';

import { Observable } from 'rxjs';

import {
  Device,
  DeviceInput,
  DeviceQuery,
  DeviceSortField,
  DeviceStatus,
  Site,
  SortDir,
} from '@core/models';
import { DeviceApi } from '@core/services/device-api';
import { SiteApi } from '@core/services/site-api';

// All matching devices are fetched in one page and rendered with CDK virtual
// scrolling; filtering and sorting still happen server-side (in the mock API),
// demonstrating real REST query handling without flooding the DOM with rows.
const FETCH_ALL_PAGE_SIZE = 1000;

/** Feature-scoped store for the device list: filter/sort state + results. */
@Injectable()
export class DevicesStore {
  private readonly api = inject(DeviceApi);
  private readonly siteApi = inject(SiteApi);
  private readonly destroyRef = inject(DestroyRef);

  // Filter / sort state.
  readonly search = signal('');
  readonly siteId = signal('');
  readonly status = signal<DeviceStatus | ''>('');
  readonly sort = signal<DeviceSortField>('status');
  readonly dir = signal<SortDir>('desc');

  // Results.
  private readonly _devices = signal<Device[]>([]);
  private readonly _total = signal(0);
  private readonly _loading = signal(true);
  private readonly _error = signal<string | null>(null);
  readonly sites = signal<Site[]>([]);

  readonly devices = this._devices.asReadonly();
  readonly total = this._total.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();
  readonly hasActiveFilters = computed(
    () => !!this.search() || !!this.siteId() || !!this.status(),
  );

  // Bumping this re-runs the query — used to reload the list after a mutation.
  private readonly _refresh = signal(0);

  private readonly query = computed<DeviceQuery>(() => {
    this._refresh();
    return {
      search: this.search() || undefined,
      siteId: this.siteId() || undefined,
      status: this.status() || undefined,
      sort: this.sort(),
      dir: this.dir(),
      page: 0,
      pageSize: FETCH_ALL_PAGE_SIZE,
    };
  });

  constructor() {
    this.loadSites();

    toObservable(this.query)
      .pipe(
        debounceTime(200),
        tap(() => {
          this._loading.set(true);
          this._error.set(null);
        }),
        switchMap((q) =>
          this.api.getDevices(q).pipe(
            catchError(() => {
              this._error.set('Failed to load devices.');
              return of({ items: [], total: 0, page: 0, pageSize: 0 });
            }),
          ),
        ),
        takeUntilDestroyed(),
      )
      .subscribe((res) => {
        this._devices.set(res.items);
        this._total.set(res.total);
        this._loading.set(false);
      });
  }

  /** Toggle sort direction when re-selecting a column, else sort ascending. */
  toggleSort(field: DeviceSortField): void {
    if (this.sort() === field) {
      this.dir.update((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      this.sort.set(field);
      this.dir.set('asc');
    }
  }

  clearFilters(): void {
    this.search.set('');
    this.siteId.set('');
    this.status.set('');
  }

  /** Reload the device list (e.g. after a create/update/delete). */
  refresh(): void {
    this._refresh.update((n) => n + 1);
  }

  // CRUD: each call hits the mock REST API, then refreshes the list on success.
  // The list reload re-derives totals here; other pages re-derive on their next
  // fetch, so the whole app stays consistent.
  createDevice(input: DeviceInput): Observable<Device> {
    return this.api.createDevice(input).pipe(tap(() => this.refresh()));
  }

  updateDevice(id: string, input: DeviceInput): Observable<Device> {
    return this.api.updateDevice(id, input).pipe(tap(() => this.refresh()));
  }

  deleteDevice(id: string): Observable<{ id: string }> {
    return this.api.deleteDevice(id).pipe(tap(() => this.refresh()));
  }

  private loadSites(): void {
    this.siteApi
      .getSites()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({ next: (sites) => this.sites.set(sites) });
  }
}
