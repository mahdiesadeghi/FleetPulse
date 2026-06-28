import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import { TIME_RANGES, TimeRange } from '@core/models';

/** Segmented control for picking a time-series range (1h / 6h / 24h / 7d). */
@Component({
  selector: 'app-range-selector',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="range" role="group" [attr.aria-label]="label()">
      @for (r of ranges(); track r) {
        <button
          type="button"
          class="range__btn"
          [class.range__btn--active]="value() === r"
          [attr.aria-pressed]="value() === r"
          (click)="valueChange.emit(r)"
        >
          {{ r }}
        </button>
      }
    </div>
  `,
  styles: `
    .range {
      display: inline-flex;
      background: var(--fp-surface-container);
      border: 1px solid var(--fp-border);
      border-radius: var(--fp-radius-sm);
      padding: 3px;
      gap: 2px;
    }
    .range__btn {
      border: none;
      background: transparent;
      color: var(--fp-text-muted);
      padding: 5px 12px;
      border-radius: var(--fp-radius-xs);
      font: inherit;
      font-size: 0.82rem;
      font-weight: 600;
      text-transform: uppercase;
      cursor: pointer;
      transition:
        background var(--fp-duration-fast) var(--fp-ease),
        color var(--fp-duration-fast) var(--fp-ease);
    }
    .range__btn:hover {
      color: var(--fp-text);
    }
    .range__btn--active {
      background: var(--fp-accent);
      color: var(--fp-on-accent);
    }
  `,
})
export class RangeSelector {
  readonly ranges = input<readonly TimeRange[]>(TIME_RANGES);
  readonly value = input.required<TimeRange>();
  readonly label = input('Time range');
  readonly valueChange = output<TimeRange>();
}
