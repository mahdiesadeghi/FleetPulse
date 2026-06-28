import { DatePipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { Device } from '@core/models';
import { scoreColor } from '@shared/ui/chart/chart-options';
import { HealthGauge } from '@shared/ui/health-gauge/health-gauge';
import { TimeAgoPipe } from '@shared/pipes/time-ago.pipe';

/** Predictive-maintenance summary: health gauge, condition, RUL and key facts. */
@Component({
  selector: 'app-health-panel',
  imports: [DatePipe, DecimalPipe, TimeAgoPipe, HealthGauge],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="fp-card fp-panel">
      <h3 class="fp-panel__title">Predictive maintenance</h3>
      <app-health-gauge [score]="device().health.healthScore" [height]="170" />
      <p class="condition" [style.color]="conditionColor()">{{ condition() }}</p>

      <dl class="stats">
        <div class="stat">
          <dt>Remaining life</dt>
          <dd>{{ rulLabel() }}</dd>
        </div>
        <div class="stat">
          <dt>Runtime</dt>
          <dd>{{ device().telemetry.runtimeHours | number: '1.0-0' }} h</dd>
        </div>
        <div class="stat">
          <dt>Installed</dt>
          <dd>{{ device().installedAt | date: 'mediumDate' }}</dd>
        </div>
        <div class="stat">
          <dt>Last seen</dt>
          <dd>{{ device().lastSeenAt | timeAgo }}</dd>
        </div>
      </dl>
    </div>
  `,
  styles: `
    .condition {
      text-align: center;
      font-weight: 700;
      margin: 0 0 var(--fp-space-4);
    }
    .stats {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: var(--fp-space-3);
      margin: 0;
    }
    .stat dt {
      font-size: 0.72rem;
      text-transform: uppercase;
      letter-spacing: 0.03em;
      color: var(--fp-text-muted);
    }
    .stat dd {
      margin: 2px 0 0;
      font-weight: 600;
      font-variant-numeric: tabular-nums;
    }
  `,
})
export class HealthPanel {
  readonly device = input.required<Device>();

  protected readonly conditionColor = computed(() => scoreColor(this.device().health.healthScore));

  protected readonly condition = computed(() => {
    const s = this.device().health.healthScore;
    if (s >= 85) {
      return 'Healthy';
    }
    if (s >= 70) {
      return 'Good condition';
    }
    if (s >= 40) {
      return 'Monitor closely';
    }
    return 'At risk — service soon';
  });

  protected readonly rulLabel = computed(() => {
    const days = this.device().health.remainingUsefulLifeDays;
    return days >= 365 ? `${(days / 365).toFixed(1)} years` : `${days} days`;
  });
}
