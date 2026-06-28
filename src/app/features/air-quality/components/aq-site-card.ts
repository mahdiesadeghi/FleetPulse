import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { DecimalPipe } from '@angular/common';

import { AqRating, Site } from '@core/models';
import { HealthGauge } from '@shared/ui/health-gauge/health-gauge';

export const AQ_RATING_META: Record<AqRating, { label: string; color: string }> = {
  excellent: { label: 'Excellent', color: 'var(--fp-aq-excellent)' },
  good: { label: 'Good', color: 'var(--fp-aq-good)' },
  moderate: { label: 'Moderate', color: 'var(--fp-aq-moderate)' },
  poor: { label: 'Poor', color: 'var(--fp-aq-poor)' },
};

/** Selectable per-site air-quality card: score gauge, rating and live readings. */
@Component({
  selector: 'app-aq-site-card',
  imports: [DecimalPipe, HealthGauge],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button
      type="button"
      class="card fp-card"
      [class.card--selected]="selected()"
      [attr.aria-pressed]="selected()"
      (click)="selectSite.emit(site().id)"
    >
      <div class="card__head">
        <div class="card__titles">
          <span class="card__name">{{ site().name }}</span>
          <span class="card__loc fp-muted">{{ site().location }}</span>
        </div>
        <span class="rating" [style.--rating-color]="meta().color">{{ meta().label }}</span>
      </div>

      <app-health-gauge [score]="site().airQuality.score" [height]="130" />

      <dl class="readings">
        <div>
          <dt>CO₂</dt>
          <dd>{{ site().airQuality.co2Ppm | number: '1.0-0' }}<span>ppm</span></dd>
        </div>
        <div>
          <dt>TVOC</dt>
          <dd>{{ site().airQuality.tvocPpb | number: '1.0-0' }}<span>ppb</span></dd>
        </div>
        <div>
          <dt>Humidity</dt>
          <dd>{{ site().airQuality.humidityPct | number: '1.0-0' }}<span>%</span></dd>
        </div>
      </dl>
    </button>
  `,
  styles: `
    .card {
      width: 100%;
      text-align: left;
      padding: var(--fp-space-4);
      display: flex;
      flex-direction: column;
      gap: var(--fp-space-2);
      cursor: pointer;
      background: var(--fp-surface-container);
      transition:
        border-color var(--fp-duration-fast) var(--fp-ease),
        box-shadow var(--fp-duration) var(--fp-ease);
    }
    .card:hover {
      box-shadow: var(--fp-shadow-md);
    }
    .card--selected {
      border-color: var(--fp-accent);
      box-shadow: 0 0 0 1px var(--fp-accent);
    }
    .card__head {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: var(--fp-space-2);
    }
    .card__titles {
      display: flex;
      flex-direction: column;
      min-width: 0;
    }
    .card__name {
      font-weight: 700;
    }
    .card__loc {
      font-size: 0.8rem;
    }
    .rating {
      flex-shrink: 0;
      padding: 3px 10px;
      border-radius: var(--fp-radius-pill);
      font-size: 0.72rem;
      font-weight: 700;
      color: var(--rating-color);
      background: color-mix(in srgb, var(--rating-color) 16%, transparent);
    }
    .readings {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: var(--fp-space-2);
      margin: 0;
    }
    .readings dt {
      font-size: 0.7rem;
      text-transform: uppercase;
      letter-spacing: 0.03em;
      color: var(--fp-text-muted);
    }
    .readings dd {
      margin: 2px 0 0;
      font-weight: 700;
      font-variant-numeric: tabular-nums;
    }
    .readings dd span {
      font-size: 0.7rem;
      font-weight: 600;
      color: var(--fp-text-muted);
      margin-left: 2px;
    }
  `,
})
export class AqSiteCard {
  readonly site = input.required<Site>();
  readonly selected = input(false);
  readonly selectSite = output<string>();

  protected readonly meta = computed(() => AQ_RATING_META[this.site().airQuality.rating]);
}
