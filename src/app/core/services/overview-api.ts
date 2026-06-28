import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { FleetOverview } from '../models';

/** Data access for the aggregated overview-dashboard payload. */
@Injectable({ providedIn: 'root' })
export class OverviewApi {
  private readonly http = inject(HttpClient);

  getOverview(): Observable<FleetOverview> {
    return this.http.get<FleetOverview>('/api/overview');
  }
}
