import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';

import { ThemeStore } from '@core/services/theme-store';
import { ChartComponent } from '../chart/chart';
import { makeGaugeChart } from '../chart/chart-options';

/** Reusable 0–100 health/score gauge. Re-themes with the active theme signal. */
@Component({
  selector: 'app-health-gauge',
  imports: [ChartComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-chart [options]="options()" [height]="height()" [ariaLabel]="ariaLabel()" />
  `,
})
export class HealthGauge {
  private readonly theme = inject(ThemeStore);

  readonly score = input.required<number>();
  readonly height = input(180);

  protected readonly options = computed(() => makeGaugeChart(this.theme.theme(), this.score()));
  protected readonly ariaLabel = computed(
    () => `Score ${Math.round(this.score())} out of 100`,
  );
}
