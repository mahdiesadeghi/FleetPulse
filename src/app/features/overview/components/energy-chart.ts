import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';

import { TimeSeriesPoint } from '@core/models';
import { ThemeStore } from '@core/services/theme-store';
import { ChartComponent } from '@shared/ui/chart/chart';
import { makeLineChart } from '@shared/ui/chart/chart-options';

/** Fleet-wide energy area chart over the last 24h. */
@Component({
  selector: 'app-energy-chart',
  imports: [ChartComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<app-chart
    [options]="options()"
    [height]="260"
    ariaLabel="Fleet energy consumption over the last 24 hours"
  />`,
})
export class EnergyChart {
  private readonly theme = inject(ThemeStore);

  readonly series = input.required<TimeSeriesPoint[]>();

  protected readonly options = computed(() =>
    makeLineChart(
      this.theme.theme(),
      [{ name: 'Energy', points: this.series(), color: '#16a34a', area: true }],
      { valueSuffix: ' kW' },
    ),
  );
}
