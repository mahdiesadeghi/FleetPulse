import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';

import { DEVICE_STATUSES, Device, DeviceInput } from '@core/models';
import { ConfirmDialog } from '@shared/ui/confirm-dialog/confirm-dialog';
import { EmptyState } from '@shared/ui/empty-state/empty-state';
import { PageHeader } from '@shared/ui/page-header/page-header';
import { Skeleton } from '@shared/ui/skeleton/skeleton';
import { DEVICE_STATUS_META } from '@shared/ui/status-chip/status-chip';
import { DevicesStore } from './devices-store';
import { DevicesTable } from './components/devices-table';
import { DeviceFormDialog, DeviceFormData } from './components/device-form-dialog';

/** Container for the device list: owns filter/sort state via the store, renders
 *  the virtual-scrolled table, and orchestrates the add/edit/delete dialogs. */
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
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  private readonly destroyRef = inject(DestroyRef);

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

  protected openCreate(): void {
    this.openForm({ sites: this.store.sites() }).subscribe((input) => {
      if (!input) {
        return;
      }
      this.store.createDevice(input).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: (device) => this.notify(`Added ${device.name}`),
        error: () => this.notify('Could not add device'),
      });
    });
  }

  protected openEdit(device: Device): void {
    this.openForm({ device, sites: this.store.sites() }).subscribe((input) => {
      if (!input) {
        return;
      }
      this.store.updateDevice(device.id, input).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: (updated) => this.notify(`Updated ${updated.name}`),
        error: () => this.notify('Could not update device'),
      });
    });
  }

  protected confirmDelete(device: Device): void {
    this.dialog
      .open(ConfirmDialog, {
        data: {
          title: 'Delete device',
          message: `Delete “${device.name}”? This also removes any alerts it raised.`,
          confirmLabel: 'Delete',
        },
        width: '420px',
        maxWidth: '92vw',
      })
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((confirmed) => {
        if (!confirmed) {
          return;
        }
        this.store.deleteDevice(device.id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
          next: () => this.notify(`Deleted ${device.name}`),
          error: () => this.notify('Could not delete device'),
        });
      });
  }

  private openForm(data: DeviceFormData) {
    return this.dialog
      .open<DeviceFormDialog, DeviceFormData, DeviceInput>(DeviceFormDialog, {
        data,
        width: '560px',
        maxWidth: '95vw',
      })
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef));
  }

  private notify(message: string): void {
    this.snackBar.open(message, 'Dismiss', { duration: 3000 });
  }
}
