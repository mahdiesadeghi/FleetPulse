import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

import { EmptyState } from '@shared/ui/empty-state/empty-state';

@Component({
  selector: 'app-not-found',
  imports: [RouterLink, EmptyState],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="fp-page">
      <app-empty-state
        icon="explore_off"
        title="Page not found"
        message="The page you’re looking for doesn’t exist or has moved."
      >
        <a class="link-btn" routerLink="/overview">Back to overview</a>
      </app-empty-state>
    </div>
  `,
  styles: `
    .link-btn {
      display: inline-flex;
      align-items: center;
      padding: 8px 16px;
      border-radius: var(--fp-radius-sm);
      background: var(--fp-accent);
      color: var(--fp-on-accent);
      font-weight: 600;
    }
  `,
})
export class NotFound {}
