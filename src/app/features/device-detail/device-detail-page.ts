import { ChangeDetectionStrategy, Component, computed, effect, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { TIME_RANGES } from '@core/models';
import { AlertItem } from '@shared/ui/alert-item/alert-item';
import { EmptyState } from '@shared/ui/empty-state/empty-state';
import { RangeSelector } from '@shared/ui/range-selector/range-selector';
import { Skeleton } from '@shared/ui/skeleton/skeleton';
import { StatusChip } from '@shared/ui/status-chip/status-chip';
import { DeviceDetailStore } from './device-detail-store';
import { HealthPanel } from './components/health-panel';
import { MetricTile } from './components/metric-tile';
import { TelemetryCharts } from './components/telemetry-charts';

interface LiveTile {
  label: string;
  value: string | number;
  unit?: string;
  icon: string;
}

/** Container for a single device: live telemetry, time-series charts, and the
 *  predictive-maintenance + anomaly-history panels. The `id` input is bound
 *  from the route param via `withComponentInputBinding`. */
@Component({
  selector: 'app-device-detail-page',
  imports: [
    RouterLink,
    StatusChip,
    Skeleton,
    EmptyState,
    MetricTile,
    TelemetryCharts,
    HealthPanel,
    AlertItem,
    RangeSelector,
  ],
  providers: [DeviceDetailStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './device-detail-page.html',
  styleUrl: './device-detail-page.scss',
})
export class DeviceDetailPage {
  protected readonly store = inject(DeviceDetailStore);

  readonly id = input.required<string>();

  protected readonly device = this.store.device;
  protected readonly loading = this.store.loading;
  protected readonly error = this.store.error;
  protected readonly history = this.store.history;
  protected readonly alerts = this.store.alerts;
  protected readonly range = this.store.range;
  protected readonly ranges = TIME_RANGES;
  protected readonly skeletonTiles = [0, 1, 2, 3, 4, 5];

  protected readonly liveTiles = computed<LiveTile[]>(() => {
    const t = this.store.telemetryNow();
    if (!t) {
      return [];
    }
    return [
      { label: 'Speed', value: Math.round(t.rpm), unit: 'rpm', icon: 'speed' },
      { label: 'Power', value: Math.round(t.powerW), unit: 'W', icon: 'bolt' },
      { label: 'Temperature', value: t.temperatureC.toFixed(1), unit: '°C', icon: 'device_thermostat' },
      { label: 'Vibration', value: t.vibrationMm.toFixed(2), unit: 'mm/s', icon: 'vibration' },
      { label: 'Airflow', value: Math.round(t.airflowM3h), unit: 'm³/h', icon: 'air' },
      { label: 'Runtime', value: Math.round(t.runtimeHours), unit: 'h', icon: 'schedule' },
    ];
  });

  constructor() {
    effect(() => this.store.load(this.id()));
  }
}
