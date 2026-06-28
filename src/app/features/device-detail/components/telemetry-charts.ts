import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';

import { DeviceHistory, TelemetryMetric } from '@core/models';
import { ThemeStore } from '@core/services/theme-store';
import { ChartComponent } from '@shared/ui/chart/chart';
import { makeLineChart } from '@shared/ui/chart/chart-options';
import { Skeleton } from '@shared/ui/skeleton/skeleton';

interface ChartDef {
  metric: TelemetryMetric;
  title: string;
  suffix: string;
  color: string;
}

const DEFS: ChartDef[] = [
  { metric: 'temperatureC', title: 'Temperature', suffix: ' °C', color: '#ef4444' },
  { metric: 'vibrationMm', title: 'Vibration', suffix: ' mm/s', color: '#a855f7' },
  { metric: 'powerW', title: 'Power', suffix: ' W', color: '#3b82f6' },
  { metric: 'rpm', title: 'RPM', suffix: '', color: '#16a34a' },
];

/** 2×2 grid of themed telemetry line charts for the selected time range. */
@Component({
  selector: 'app-telemetry-charts',
  imports: [ChartComponent, Skeleton],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="charts">
      @if (charts(); as cs) {
        @for (c of cs; track c.metric) {
          <div class="fp-card chart-card">
            <h3 class="chart-card__title">{{ c.title }}</h3>
            <app-chart [options]="c.options" [height]="200" [ariaLabel]="c.title + ' over time'" />
          </div>
        }
      } @else {
        @for (d of defs; track d.metric) {
          <div class="fp-card chart-card">
            <h3 class="chart-card__title">{{ d.title }}</h3>
            <app-skeleton height="200px" radius="var(--fp-radius-md)" />
          </div>
        }
      }
    </div>
  `,
  styles: `
    .charts {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: var(--fp-space-4);
    }
    .chart-card {
      padding: var(--fp-space-4);
    }
    .chart-card__title {
      font-size: 0.9rem;
      font-weight: 600;
      margin-bottom: var(--fp-space-2);
    }
    @media (max-width: 720px) {
      .charts {
        grid-template-columns: 1fr;
      }
    }
  `,
})
export class TelemetryCharts {
  private readonly theme = inject(ThemeStore);

  readonly history = input.required<DeviceHistory | null>();
  protected readonly defs = DEFS;

  protected readonly charts = computed(() => {
    const history = this.history();
    const theme = this.theme.theme();
    if (!history) {
      return null;
    }
    return DEFS.map((def) => ({
      ...def,
      options: makeLineChart(
        theme,
        [{ name: def.title, points: history.series[def.metric], color: def.color, area: true }],
        { valueSuffix: def.suffix },
      ),
    }));
  });
}
