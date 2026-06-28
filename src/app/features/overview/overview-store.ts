import { DestroyRef, Injectable, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { FleetOverview } from '@core/models';
import { OverviewApi } from '@core/services/overview-api';

/**
 * Feature-scoped signal store for the overview dashboard. Provided at the route
 * component (not root) so its lifetime matches the page. Exposes read-only
 * data/loading/error signals; the container just renders them.
 */
@Injectable()
export class OverviewStore {
  private readonly api = inject(OverviewApi);
  private readonly destroyRef = inject(DestroyRef);

  private readonly _data = signal<FleetOverview | null>(null);
  private readonly _loading = signal(false);
  private readonly _error = signal<string | null>(null);

  readonly data = this._data.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();

  load(): void {
    this._loading.set(true);
    this._error.set(null);
    this.api
      .getOverview()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => {
          this._data.set(data);
          this._loading.set(false);
        },
        error: () => {
          this._error.set('We couldn’t reach the fleet service. Please try again.');
          this._loading.set(false);
        },
      });
  }
}
