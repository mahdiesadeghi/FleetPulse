import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** Small live-telemetry tile (label, animated value, unit, icon). */
@Component({
  selector: 'app-metric-tile',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="tile fp-card">
      <div class="tile__head">
        <span class="tile__label">{{ label() }}</span>
        @if (icon()) {
          <span class="tile__icon material-icons" aria-hidden="true">{{ icon() }}</span>
        }
      </div>
      <div class="tile__value">
        {{ value() }}@if (unit()) {<span class="tile__unit">{{ unit() }}</span>}
      </div>
    </div>
  `,
  styles: `
    .tile {
      padding: var(--fp-space-4);
      display: flex;
      flex-direction: column;
      gap: var(--fp-space-2);
    }
    .tile__head {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .tile__label {
      font-size: 0.72rem;
      font-weight: 600;
      letter-spacing: 0.03em;
      text-transform: uppercase;
      color: var(--fp-text-muted);
    }
    .tile__icon {
      font-size: 18px;
      color: var(--fp-text-muted);
    }
    .tile__value {
      font-size: 1.5rem;
      font-weight: 700;
      font-variant-numeric: tabular-nums;
    }
    .tile__unit {
      font-size: 0.85rem;
      font-weight: 600;
      color: var(--fp-text-muted);
      margin-left: 3px;
    }
  `,
})
export class MetricTile {
  readonly label = input.required<string>();
  readonly value = input.required<string | number>();
  readonly unit = input<string>();
  readonly icon = input<string>();
}
