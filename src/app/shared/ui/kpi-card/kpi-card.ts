import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** Headline metric card used across the dashboard. Purely presentational. */
@Component({
  selector: 'app-kpi-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="kpi fp-card">
      <div class="kpi__head">
        <span class="kpi__label">{{ label() }}</span>
        @if (icon()) {
          <span class="kpi__icon material-icons" [style.color]="accent()" aria-hidden="true">{{
            icon()
          }}</span>
        }
      </div>
      <div class="kpi__value">
        {{ value() }}@if (unit()) {<span class="kpi__unit">{{ unit() }}</span>}
      </div>
      @if (hint()) {
        <div class="kpi__hint">{{ hint() }}</div>
      }
    </div>
  `,
  styles: `
    .kpi {
      padding: var(--fp-space-4) var(--fp-space-5);
      display: flex;
      flex-direction: column;
      gap: var(--fp-space-2);
      min-height: 116px;
      transition: box-shadow var(--fp-duration) var(--fp-ease);
    }
    .kpi:hover {
      box-shadow: var(--fp-shadow-md);
    }
    .kpi__head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--fp-space-3);
    }
    .kpi__label {
      font-size: 0.78rem;
      font-weight: 600;
      letter-spacing: 0.03em;
      text-transform: uppercase;
      color: var(--fp-text-muted);
    }
    .kpi__icon {
      font-size: 22px;
    }
    .kpi__value {
      font-size: 2rem;
      font-weight: 700;
      line-height: 1.1;
      color: var(--fp-text);
    }
    .kpi__unit {
      font-size: 0.95rem;
      font-weight: 600;
      color: var(--fp-text-muted);
      margin-left: 4px;
    }
    .kpi__hint {
      font-size: 0.8rem;
      color: var(--fp-text-muted);
    }
  `,
})
export class KpiCard {
  readonly label = input.required<string>();
  readonly value = input.required<string | number>();
  readonly unit = input<string>();
  readonly icon = input<string>();
  readonly hint = input<string>();
  readonly accent = input('var(--fp-accent)');
}
