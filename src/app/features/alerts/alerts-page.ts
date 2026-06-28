import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';

import { ALERT_SEVERITIES } from '@core/models';
import { ALERT_SEVERITY_META, AlertItem } from '@shared/ui/alert-item/alert-item';
import { EmptyState } from '@shared/ui/empty-state/empty-state';
import { PageHeader } from '@shared/ui/page-header/page-header';
import { Skeleton } from '@shared/ui/skeleton/skeleton';
import { AlertsStore } from './alerts-store';

/** Container for the alert feed: filter controls + acknowledge-able list. */
@Component({
  selector: 'app-alerts-page',
  imports: [
    FormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatSelectModule,
    PageHeader,
    EmptyState,
    Skeleton,
    AlertItem,
  ],
  providers: [AlertsStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './alerts-page.html',
  styleUrl: './alerts-page.scss',
})
export class AlertsPage {
  protected readonly store = inject(AlertsStore);

  protected readonly severityOptions = ALERT_SEVERITIES.map((value) => ({
    value,
    label: ALERT_SEVERITY_META[value].label,
  }));
  protected readonly skeletonRows = [0, 1, 2, 3, 4];

  protected readonly subtitle = computed(() => {
    const total = this.store.alerts().length;
    return `${this.store.openCount()} open · ${total} shown`;
  });
}
