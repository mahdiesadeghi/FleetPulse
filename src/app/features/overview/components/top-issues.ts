import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { Device } from '@core/models';
import { scoreColor } from '@shared/ui/chart/chart-options';
import { StatusChip } from '@shared/ui/status-chip/status-chip';

/** Compact list of the least-healthy devices, linking through to detail. */
@Component({
  selector: 'app-top-issues',
  imports: [RouterLink, StatusChip],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (devices().length === 0) {
      <p class="fp-muted">No issues — the whole fleet is healthy.</p>
    } @else {
      <ul class="issues">
        @for (d of devices(); track d.id) {
          <li class="issue">
            <a class="issue__name" [routerLink]="['/devices', d.id]">{{ d.name }}</a>
            <span class="issue__site fp-muted">{{ d.siteName }}</span>
            <app-status-chip [status]="d.status" />
            <div class="issue__health">
              <span class="bar">
                <span
                  class="bar__fill"
                  [style.width.%]="d.health.healthScore"
                  [style.background]="color(d.health.healthScore)"
                ></span>
              </span>
              <span class="issue__score">{{ d.health.healthScore }}</span>
            </div>
          </li>
        }
      </ul>
    }
  `,
  styles: `
    .issues {
      list-style: none;
      margin: 0;
      padding: 0;
      display: flex;
      flex-direction: column;
    }
    .issue {
      display: grid;
      grid-template-columns: minmax(0, 2fr) minmax(0, 1.4fr) auto 160px;
      align-items: center;
      gap: var(--fp-space-3);
      padding: var(--fp-space-3) 0;
      border-top: 1px solid var(--fp-border);
    }
    .issue:first-child {
      border-top: none;
    }
    .issue__name {
      font-weight: 600;
      color: var(--fp-text);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .issue__name:hover {
      color: var(--fp-accent);
    }
    .issue__site {
      font-size: 0.85rem;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .issue__health {
      display: flex;
      align-items: center;
      gap: var(--fp-space-3);
    }
    .bar {
      flex: 1;
      height: 6px;
      border-radius: var(--fp-radius-pill);
      background: var(--fp-surface-container-highest);
      overflow: hidden;
    }
    .bar__fill {
      display: block;
      height: 100%;
      border-radius: inherit;
    }
    .issue__score {
      width: 28px;
      text-align: right;
      font-weight: 600;
      font-variant-numeric: tabular-nums;
    }
    @media (max-width: 640px) {
      .issue {
        grid-template-columns: 1fr auto;
        grid-template-areas:
          'name status'
          'health health';
        row-gap: var(--fp-space-2);
      }
      .issue__name {
        grid-area: name;
      }
      .issue__site {
        display: none;
      }
      .issue__health {
        grid-area: health;
      }
    }
  `,
})
export class TopIssues {
  readonly devices = input.required<Device[]>();
  protected readonly color = scoreColor;
}
