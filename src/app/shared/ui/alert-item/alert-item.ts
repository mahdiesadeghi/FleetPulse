import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { RouterLink } from '@angular/router';

import { Alert, AlertSeverity, AlertType } from '@core/models';
import { TimeAgoPipe } from '@shared/pipes/time-ago.pipe';

export interface SeverityMeta {
  icon: string;
  color: string;
  label: string;
}

export const ALERT_SEVERITY_META: Record<AlertSeverity, SeverityMeta> = {
  info: { icon: 'info', color: 'var(--fp-severity-info)', label: 'Info' },
  warning: { icon: 'warning', color: 'var(--fp-severity-warning)', label: 'Warning' },
  critical: { icon: 'error', color: 'var(--fp-severity-critical)', label: 'Critical' },
};

export const ALERT_TYPE_LABEL: Record<AlertType, string> = {
  rising_vibration: 'Rising vibration',
  overheating: 'Overheating',
  power_anomaly: 'Power anomaly',
  low_airflow: 'Low airflow',
  offline: 'Offline',
  air_quality: 'Air quality',
};

/** Reusable alert row: severity accent, message, optional device link, ack. */
@Component({
  selector: 'app-alert-item',
  imports: [RouterLink, MatButtonModule, TimeAgoPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="alert"
      [class.alert--ack]="alert().acknowledged"
      [style.--sev-color]="meta().color"
    >
      <span class="alert__icon material-icons" aria-hidden="true">{{ meta().icon }}</span>

      <div class="alert__body">
        <div class="alert__top">
          <span class="alert__type">{{ typeLabel() }}</span>
          <span class="alert__time fp-muted">{{ alert().createdAt | timeAgo }}</span>
        </div>
        <p class="alert__msg">{{ alert().message }}</p>
        @if (showDevice()) {
          <div class="alert__meta fp-muted">
            <a class="alert__device" [routerLink]="['/devices', alert().deviceId]">{{
              alert().deviceName
            }}</a>
            <span>· {{ alert().siteName }}</span>
          </div>
        }
      </div>

      <div class="alert__action">
        @if (alert().acknowledged) {
          <span class="ack-chip">
            <span class="material-icons" aria-hidden="true">check_circle</span> Acknowledged
          </span>
        } @else {
          <button matButton="outlined" type="button" (click)="acknowledge.emit(alert().id)">
            Acknowledge
          </button>
        }
      </div>
    </div>
  `,
  styles: `
    .alert {
      display: grid;
      grid-template-columns: auto 1fr auto;
      align-items: center;
      gap: var(--fp-space-3);
      padding: var(--fp-space-3) var(--fp-space-4);
      border-left: 3px solid var(--sev-color);
      border-radius: var(--fp-radius-sm);
      background: var(--fp-surface-container);
      transition: opacity var(--fp-duration) var(--fp-ease);
    }
    .alert--ack {
      opacity: 0.62;
    }
    .alert__icon {
      color: var(--sev-color);
      font-size: 22px;
    }
    .alert__body {
      min-width: 0;
    }
    .alert__top {
      display: flex;
      align-items: baseline;
      gap: var(--fp-space-3);
    }
    .alert__type {
      font-weight: 600;
      font-size: 0.9rem;
    }
    .alert__time {
      font-size: 0.78rem;
    }
    .alert__msg {
      margin: 2px 0 0;
      font-size: 0.875rem;
      color: var(--fp-text);
    }
    .alert__meta {
      display: flex;
      gap: 6px;
      margin-top: 4px;
      font-size: 0.8rem;
    }
    .alert__device {
      font-weight: 600;
    }
    .ack-chip {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 0.8rem;
      font-weight: 600;
      color: var(--fp-status-online);
      white-space: nowrap;
    }
    .ack-chip .material-icons {
      font-size: 18px;
    }
    @media (max-width: 600px) {
      .alert {
        grid-template-columns: auto 1fr;
      }
      .alert__action {
        grid-column: 2;
        justify-self: start;
      }
    }
  `,
})
export class AlertItem {
  readonly alert = input.required<Alert>();
  readonly showDevice = input(true);
  readonly acknowledge = output<string>();

  protected readonly meta = computed(() => ALERT_SEVERITY_META[this.alert().severity]);
  protected readonly typeLabel = computed(() => ALERT_TYPE_LABEL[this.alert().type]);
}
