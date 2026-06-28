import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { EmptyState } from '@shared/ui/empty-state/empty-state';
import { PageHeader } from '@shared/ui/page-header/page-header';
import { RangeSelector } from '@shared/ui/range-selector/range-selector';
import { Skeleton } from '@shared/ui/skeleton/skeleton';
import { AirQualityStore } from './air-quality-store';
import { AqSiteCard } from './components/aq-site-card';
import { AqTrends } from './components/aq-trends';

/** Container for the air-quality view: per-site cards and the selected site's
 *  CO₂ / TVOC / humidity / score trends. */
@Component({
  selector: 'app-air-quality-page',
  imports: [PageHeader, EmptyState, Skeleton, RangeSelector, AqSiteCard, AqTrends],
  providers: [AirQualityStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './air-quality-page.html',
  styleUrl: './air-quality-page.scss',
})
export class AirQualityPage {
  protected readonly store = inject(AirQualityStore);
  protected readonly skeletonCards = [0, 1, 2, 3];
}
