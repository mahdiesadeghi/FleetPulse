import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { DeviceStatus } from '@core/models';

export interface StatusMeta {
  label: string;
  color: string;
  tint: string;
}

/** Display metadata for each device status — shared by the chip and tables. */
export const DEVICE_STATUS_META: Record<DeviceStatus, StatusMeta> = {
  online: { label: 'Online', color: 'var(--fp-status-online)', tint: 'var(--fp-tint-online)' },
  warning: { label: 'Warning', color: 'var(--fp-status-warning)', tint: 'var(--fp-tint-warning)' },
  critical: { label: 'Critical', color: 'var(--fp-status-critical)', tint: 'var(--fp-tint-critical)' },
  offline: { label: 'Offline', color: 'var(--fp-status-offline)', tint: 'var(--fp-tint-offline)' },
};

/** Concrete hex colours for charts (ECharts can't read CSS custom properties). */
export const DEVICE_STATUS_HEX: Record<DeviceStatus, string> = {
  online: '#16a34a',
  warning: '#f59e0b',
  critical: '#ef4444',
  offline: '#94a3b8',
};

@Component({
  selector: 'app-status-chip',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span class="chip" [style.--chip-color]="meta().color" [style.--chip-tint]="meta().tint">
      <span class="chip__dot" aria-hidden="true"></span>{{ meta().label }}
    </span>
  `,
  styles: `
    .chip {
      display: inline-flex;
      align-items: center;
      gap: var(--fp-space-2);
      padding: 3px 10px;
      border-radius: var(--fp-radius-pill);
      background: var(--chip-tint);
      color: var(--chip-color);
      font-size: 0.75rem;
      font-weight: 600;
      line-height: 1.4;
      white-space: nowrap;
    }
    .chip__dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: currentColor;
    }
  `,
})
export class StatusChip {
  readonly status = input.required<DeviceStatus>();
  protected readonly meta = computed(() => DEVICE_STATUS_META[this.status()]);
}
