import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';

import { AqMetric, SiteAqHistory } from '@core/models';
import { ThemeStore } from '@core/services/theme-store';
import { ChartComponent } from '@shared/ui/chart/chart';
import { makeLineChart } from '@shared/ui/chart/chart-options';
import { Skeleton } from '@shared/ui/skeleton/skeleton';

interface ChartDef {
  metric: AqMetric;
  title: string;
  suffix: string;
  color: string;
}

const DEFS: ChartDef[] = [
  { metric: 'co2Ppm', title: 'CO₂', suffix: ' ppm', color: '#f59e0b' },
  { metric: 'tvocPpb', title: 'TVOC', suffix: ' ppb', color: '#a855f7' },
  { metric: 'humidityPct', title: 'Humidity', suffix: ' %', color: '#3b82f6' },
  { metric: 'score', title: 'Air-quality score', suffix: '/100', color: '#16a34a' },
];

/** 2×2 grid of air-quality trend charts for the selected site. */
@Component({
  selector: 'app-aq-trends',
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
export class AqTrends {
  private readonly theme = inject(ThemeStore);

  readonly history = input.required<SiteAqHistory | null>();
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
