import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';

import { DEVICE_MODELS, DEVICE_STATUSES, Device, DeviceInput, Site } from '@core/models';
import { DEVICE_STATUS_META } from '@shared/ui/status-chip/status-chip';

export interface DeviceFormData {
  /** Present when editing; absent when creating. */
  device?: Device;
  sites: Site[];
}

/** Add/edit form for a device. Closes with a {@link DeviceInput} on save. */
@Component({
  selector: 'app-device-form-dialog',
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h2 mat-dialog-title>{{ isEdit ? 'Edit device' : 'Add device' }}</h2>

    <form [formGroup]="form" (ngSubmit)="save()">
      <mat-dialog-content>
        <div class="grid">
          <mat-form-field class="span-2" appearance="outline">
            <mat-label>Name</mat-label>
            <input matInput formControlName="name" maxlength="60" />
            @if (form.controls.name.invalid && form.controls.name.touched) {
              <mat-error>A name is required.</mat-error>
            }
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Model</mat-label>
            <mat-select formControlName="model">
              @for (m of models; track m) {
                <mat-option [value]="m">{{ m }}</mat-option>
              }
            </mat-select>
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Site</mat-label>
            <mat-select formControlName="siteId">
              @for (s of data.sites; track s.id) {
                <mat-option [value]="s.id">{{ s.name }}</mat-option>
              }
            </mat-select>
          </mat-form-field>

          <mat-form-field class="span-2" appearance="outline">
            <mat-label>Status</mat-label>
            <mat-select formControlName="status">
              @for (opt of statusOptions; track opt.value) {
                <mat-option [value]="opt.value">{{ opt.label }}</mat-option>
              }
            </mat-select>
          </mat-form-field>

          <p class="section span-2">Telemetry</p>

          <mat-form-field appearance="outline">
            <mat-label>Speed (rpm)</mat-label>
            <input matInput type="number" formControlName="rpm" />
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Power (W)</mat-label>
            <input matInput type="number" formControlName="powerW" />
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Temperature (°C)</mat-label>
            <input matInput type="number" formControlName="temperatureC" />
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Vibration (mm/s)</mat-label>
            <input matInput type="number" formControlName="vibrationMm" />
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Airflow (m³/h)</mat-label>
            <input matInput type="number" formControlName="airflowM3h" />
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Runtime (h)</mat-label>
            <input matInput type="number" formControlName="runtimeHours" />
          </mat-form-field>
        </div>
        <p class="hint">Health, status colour and alerts are derived from these values.</p>
      </mat-dialog-content>

      <mat-dialog-actions align="end">
        <button matButton type="button" mat-dialog-close>Cancel</button>
        <button matButton="filled" type="submit" [disabled]="form.invalid">
          {{ isEdit ? 'Save changes' : 'Add device' }}
        </button>
      </mat-dialog-actions>
    </form>
  `,
  styles: `
    .grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: var(--fp-space-2) var(--fp-space-3);
      padding-top: var(--fp-space-2);
      min-width: min(460px, 78vw);
    }
    .span-2 {
      grid-column: 1 / -1;
    }
    .section {
      margin: var(--fp-space-2) 0 0;
      font-size: 0.78rem;
      font-weight: 600;
      letter-spacing: 0.03em;
      text-transform: uppercase;
      color: var(--fp-text-muted);
    }
    .hint {
      margin: var(--fp-space-2) 0 0;
      font-size: 0.8rem;
      color: var(--fp-text-muted);
    }
  `,
})
export class DeviceFormDialog {
  private readonly fb = inject(FormBuilder);
  private readonly dialogRef = inject(MatDialogRef<DeviceFormDialog, DeviceInput>);
  protected readonly data = inject<DeviceFormData>(MAT_DIALOG_DATA);

  protected readonly isEdit = !!this.data.device;
  protected readonly models = DEVICE_MODELS;
  protected readonly statusOptions = DEVICE_STATUSES.map((value) => ({
    value,
    label: DEVICE_STATUS_META[value].label,
  }));

  protected readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(60)]],
    model: [this.models[0] as string, Validators.required],
    siteId: ['', Validators.required],
    status: ['online' as Device['status'], Validators.required],
    rpm: [1500, [Validators.required, Validators.min(0)]],
    powerW: [1000, [Validators.required, Validators.min(0)]],
    temperatureC: [45, [Validators.required, Validators.min(0)]],
    vibrationMm: [1.5, [Validators.required, Validators.min(0)]],
    airflowM3h: [1500, [Validators.required, Validators.min(0)]],
    runtimeHours: [5000, [Validators.required, Validators.min(0)]],
  });

  constructor() {
    const d = this.data.device;
    if (d) {
      this.form.setValue({
        name: d.name,
        model: d.model,
        siteId: d.siteId,
        status: d.status,
        rpm: d.telemetry.rpm,
        powerW: d.telemetry.powerW,
        temperatureC: d.telemetry.temperatureC,
        vibrationMm: d.telemetry.vibrationMm,
        airflowM3h: d.telemetry.airflowM3h,
        runtimeHours: d.telemetry.runtimeHours,
      });
    } else if (this.data.sites.length) {
      this.form.controls.siteId.setValue(this.data.sites[0].id);
    }
  }

  protected save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    const input: DeviceInput = {
      name: v.name.trim(),
      model: v.model,
      siteId: v.siteId,
      status: v.status,
      telemetry: {
        rpm: v.rpm,
        powerW: v.powerW,
        temperatureC: v.temperatureC,
        vibrationMm: v.vibrationMm,
        airflowM3h: v.airflowM3h,
        runtimeHours: v.runtimeHours,
      },
    };
    this.dialogRef.close(input);
  }
}
