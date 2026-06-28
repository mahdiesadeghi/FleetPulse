import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { ScrollingModule } from '@angular/cdk/scrolling';
import { RouterLink } from '@angular/router';

import { Device, DeviceSortField, SortDir } from '@core/models';
import { scoreColor } from '@shared/ui/chart/chart-options';
import { StatusChip } from '@shared/ui/status-chip/status-chip';

interface Column {
  label: string;
  sortKey?: DeviceSortField;
  numeric?: boolean;
}

/**
 * Presentational device table. Renders rows with CDK virtual scrolling so the
 * DOM stays light regardless of fleet size, and emits sort requests upward.
 */
@Component({
  selector: 'app-devices-table',
  imports: [ScrollingModule, RouterLink, DecimalPipe, StatusChip],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './devices-table.html',
  styleUrl: './devices-table.scss',
})
export class DevicesTable {
  readonly devices = input.required<Device[]>();
  readonly sort = input.required<DeviceSortField>();
  readonly sortDir = input.required<SortDir>();
  readonly sortChange = output<DeviceSortField>();

  protected readonly rowHeight = 56;
  protected readonly columns: Column[] = [
    { label: 'Device', sortKey: 'name' },
    { label: 'Model' },
    { label: 'Site', sortKey: 'siteName' },
    { label: 'Status', sortKey: 'status' },
    { label: 'Temp', sortKey: 'temperatureC', numeric: true },
    { label: 'Power', sortKey: 'powerW', numeric: true },
    { label: 'Health', sortKey: 'healthScore', numeric: true },
  ];
  protected readonly color = scoreColor;

  protected trackId = (_: number, d: Device): string => d.id;

  protected onSort(col: Column): void {
    if (col.sortKey) {
      this.sortChange.emit(col.sortKey);
    }
  }
}
