import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { NgxEchartsDirective } from 'ngx-echarts';
import type { EChartsCoreOption } from 'echarts/core';

/**
 * Presentational wrapper around ngx-echarts. Owns sizing, the loading spinner,
 * auto-resize and accessibility (exposes the chart as an `img` with a label).
 * Callers pass a fully-built, themed option from the chart-option builders.
 */
@Component({
  selector: 'app-chart',
  imports: [NgxEchartsDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="chart" role="img" [attr.aria-label]="ariaLabel()" [style.height.px]="height()">
      <div
        echarts
        class="chart__canvas"
        [options]="options()"
        [loading]="loading()"
        [autoResize]="true"
      ></div>
    </div>
  `,
  styles: `
    .chart {
      width: 100%;
      position: relative;
    }
    .chart__canvas {
      width: 100%;
      height: 100%;
    }
  `,
})
export class ChartComponent {
  readonly options = input.required<EChartsCoreOption>();
  readonly height = input(280);
  readonly loading = input(false);
  readonly ariaLabel = input('chart');
}
