import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { EMPTY, catchError, filter, of, switchMap, tap } from 'rxjs';

import { Alert, Device, DeviceHistory, Telemetry, TimeRange } from '@core/models';
import { AlertApi } from '@core/services/alert-api';
import { DeviceApi } from '@core/services/device-api';
import { TelemetryStream } from '@core/services/telemetry-stream';

/**
 * Coordinates everything on the device-detail page from two inputs — the device
 * id and the chart time-range. Switching device tears down the previous live
 * stream automatically (outer `switchMap`); changing either id or range reloads
 * the history. Kept feature-scoped (provided on the route component).
 */
@Injectable()
export class DeviceDetailStore {
  private readonly deviceApi = inject(DeviceApi);
  private readonly alertApi = inject(AlertApi);
  private readonly telemetry = inject(TelemetryStream);
  private readonly destroyRef = inject(DestroyRef);

  readonly deviceId = signal('');
  readonly range = signal<TimeRange>('24h');

  private readonly _device = signal<Device | null>(null);
  private readonly _loading = signal(true);
  private readonly _error = signal<string | null>(null);
  private readonly _live = signal<Telemetry | null>(null);
  private readonly _history = signal<DeviceHistory | null>(null);
  private readonly _historyLoading = signal(true);
  private readonly _alerts = signal<Alert[]>([]);

  readonly device = this._device.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();
  readonly history = this._history.asReadonly();
  readonly historyLoading = this._historyLoading.asReadonly();
  readonly alerts = this._alerts.asReadonly();

  /** The reading to show on the live tiles: the latest stream value, or the
   *  device snapshot before the first tick arrives. */
  readonly telemetryNow = computed(() => this._live() ?? this._device()?.telemetry ?? null);

  constructor() {
    // Device load → start (and re-start) the live telemetry stream.
    toObservable(this.deviceId)
      .pipe(
        filter((id): id is string => !!id),
        tap(() => {
          this._loading.set(true);
          this._error.set(null);
          this._device.set(null);
          this._live.set(null);
        }),
        switchMap((id) =>
          this.deviceApi.getDevice(id).pipe(
            catchError(() => {
              this._error.set('This device could not be found.');
              this._loading.set(false);
              return EMPTY;
            }),
          ),
        ),
        tap((device) => {
          this._device.set(device);
          this._loading.set(false);
          this.loadAlerts(device.id);
        }),
        switchMap((device) => this.telemetry.connect(device)),
        takeUntilDestroyed(),
      )
      .subscribe((reading) => this._live.set(reading));

    // History depends on both the device id and the selected range.
    toObservable(computed(() => ({ id: this.deviceId(), range: this.range() })))
      .pipe(
        filter((key) => !!key.id),
        tap(() => this._historyLoading.set(true)),
        switchMap((key) =>
          this.deviceApi.getHistory(key.id, key.range).pipe(catchError(() => of(null))),
        ),
        takeUntilDestroyed(),
      )
      .subscribe((history) => {
        this._history.set(history);
        this._historyLoading.set(false);
      });
  }

  load(id: string): void {
    this.deviceId.set(id);
  }

  setRange(range: TimeRange): void {
    this.range.set(range);
  }

  acknowledge(id: string): void {
    this.alertApi
      .acknowledge(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((updated) =>
        this._alerts.update((list) => list.map((a) => (a.id === updated.id ? updated : a))),
      );
  }

  private loadAlerts(id: string): void {
    this.alertApi
      .getAlerts({ deviceId: id })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((alerts) => this._alerts.set(alerts));
  }
}
