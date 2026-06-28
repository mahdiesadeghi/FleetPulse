import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** Consistent page title block with an optional projected actions slot. */
@Component({
  selector: 'app-page-header',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="ph">
      <div class="ph__titles">
        <h1 class="ph__title">{{ title() }}</h1>
        @if (subtitle()) {
          <p class="ph__subtitle">{{ subtitle() }}</p>
        }
      </div>
      <div class="ph__actions"><ng-content /></div>
    </header>
  `,
  styles: `
    .ph {
      display: flex;
      align-items: flex-end;
      justify-content: space-between;
      gap: var(--fp-space-4);
      flex-wrap: wrap;
      margin-bottom: var(--fp-space-5);
    }
    .ph__title {
      font-size: 1.5rem;
      font-weight: 700;
    }
    .ph__subtitle {
      margin: 4px 0 0;
      color: var(--fp-text-muted);
      font-size: 0.9rem;
    }
    .ph__actions {
      display: flex;
      align-items: center;
      gap: var(--fp-space-3);
      flex-wrap: wrap;
    }
    .ph__actions:empty {
      display: none;
    }
  `,
})
export class PageHeader {
  readonly title = input.required<string>();
  readonly subtitle = input<string>();
}
