import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';

import { KpiCard } from '@shared/ui/kpi-card/kpi-card';
import { PageHeader } from '@shared/ui/page-header/page-header';
import { Skeleton } from '@shared/ui/skeleton/skeleton';
import { EmptyState } from '@shared/ui/empty-state/empty-state';
import { OverviewStore } from './overview-store';
import { EnergyChart } from './components/energy-chart';
import { FleetStatusChart } from './components/fleet-status-chart';
import { TopIssues } from './components/top-issues';

/** Container for the overview dashboard: loads the aggregate payload and lays
 *  out KPIs, the fleet-status donut, the 24h energy chart and the top-issues
 *  list. Presentational children do the rendering. */
@Component({
  selector: 'app-overview-page',
  imports: [
    MatButtonModule,
    PageHeader,
    KpiCard,
    Skeleton,
    EmptyState,
    EnergyChart,
    FleetStatusChart,
    TopIssues,
  ],
  providers: [OverviewStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './overview-page.html',
  styleUrl: './overview-page.scss',
})
export class OverviewPage {
  private readonly store = inject(OverviewStore);

  protected readonly data = this.store.data;
  protected readonly error = this.store.error;
  protected readonly kpis = computed(() => this.store.data()?.kpis ?? null);
  protected readonly skeletonCards = [0, 1, 2, 3, 4];

  constructor() {
    this.store.load();
  }

  protected reload(): void {
    this.store.load();
  }
}
