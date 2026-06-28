import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';

import { DEVICE_STATUSES } from '@core/models';
import { EmptyState } from '@shared/ui/empty-state/empty-state';
import { PageHeader } from '@shared/ui/page-header/page-header';
import { Skeleton } from '@shared/ui/skeleton/skeleton';
import { DEVICE_STATUS_META } from '@shared/ui/status-chip/status-chip';
import { DevicesStore } from './devices-store';
import { DevicesTable } from './components/devices-table';

/** Container for the device list: owns filter/sort state via the store and
 *  renders the virtual-scrolled table, plus loading/empty/error states. */
@Component({
  selector: 'app-devices-page',
  imports: [
    FormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    PageHeader,
    EmptyState,
    Skeleton,
    DevicesTable,
  ],
  providers: [DevicesStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './devices-page.html',
  styleUrl: './devices-page.scss',
})
export class DevicesPage {
  protected readonly store = inject(DevicesStore);

  protected readonly statusOptions = DEVICE_STATUSES.map((value) => ({
    value,
    label: DEVICE_STATUS_META[value].label,
  }));
  protected readonly skeletonRows = [0, 1, 2, 3, 4, 5, 6, 7];

  protected readonly subtitle = computed(() => {
    const total = this.store.total();
    const suffix = this.store.hasActiveFilters() ? ' match your filters' : ' across the fleet';
    return `${total.toLocaleString()} device${total === 1 ? '' : 's'}${suffix}`;
  });
}
