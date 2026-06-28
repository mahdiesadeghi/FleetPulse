import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';

import { DeviceStatus } from '@core/models';
import { ThemeStore } from '@core/services/theme-store';
import { ChartComponent } from '@shared/ui/chart/chart';
import { makeDonutChart } from '@shared/ui/chart/chart-options';
import { DEVICE_STATUS_HEX, DEVICE_STATUS_META } from '@shared/ui/status-chip/status-chip';

/** Donut of device counts by status. Presentational — data in, chart out. */
@Component({
  selector: 'app-fleet-status-chart',
  imports: [ChartComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<app-chart [options]="options()" [height]="260" ariaLabel="Fleet status breakdown" />`,
})
export class FleetStatusChart {
  private readonly theme = inject(ThemeStore);

  readonly breakdown = input.required<{ status: DeviceStatus; count: number }[]>();

  protected readonly options = computed(() =>
    makeDonutChart(
      this.theme.theme(),
      this.breakdown().map((b) => ({
        name: DEVICE_STATUS_META[b.status].label,
        value: b.count,
        color: DEVICE_STATUS_HEX[b.status],
      })),
      'devices',
    ),
  );
}
