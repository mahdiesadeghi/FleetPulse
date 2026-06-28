import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Friendly placeholder for empty / error results. Project action buttons via
 * content: `<app-empty-state ...><button>Retry</button></app-empty-state>`.
 */
@Component({
  selector: 'app-empty-state',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="empty" [class.empty--error]="tone() === 'error'">
      <span class="empty__icon material-icons" aria-hidden="true">{{ icon() }}</span>
      <h3 class="empty__title">{{ title() }}</h3>
      @if (message()) {
        <p class="empty__message">{{ message() }}</p>
      }
      <div class="empty__actions"><ng-content /></div>
    </div>
  `,
  styles: `
    .empty {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      gap: var(--fp-space-2);
      padding: var(--fp-space-7) var(--fp-space-4);
      color: var(--fp-text-muted);
    }
    .empty__icon {
      font-size: 44px;
      color: var(--fp-text-muted);
      opacity: 0.7;
    }
    .empty--error .empty__icon {
      color: var(--fp-status-critical);
      opacity: 1;
    }
    .empty__title {
      font-size: 1rem;
      color: var(--fp-text);
    }
    .empty__message {
      margin: 0;
      max-width: 42ch;
      font-size: 0.875rem;
    }
    .empty__actions:empty {
      display: none;
    }
    .empty__actions {
      margin-top: var(--fp-space-2);
    }
  `,
})
export class EmptyState {
  readonly icon = input('inbox');
  readonly title = input.required<string>();
  readonly message = input<string>();
  readonly tone = input<'muted' | 'error'>('muted');
}
