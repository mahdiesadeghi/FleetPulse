import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { Site, SiteAqHistory, TimeRange } from '../models';
import { toHttpParams } from '../util/http';

/** Data access for sites and per-site air-quality history. */
@Injectable({ providedIn: 'root' })
export class SiteApi {
  private readonly http = inject(HttpClient);
  private readonly base = '/api/sites';

  getSites(): Observable<Site[]> {
    return this.http.get<Site[]>(this.base);
  }

  getAirQualityHistory(siteId: string, range: TimeRange): Observable<SiteAqHistory> {
    return this.http.get<SiteAqHistory>(`${this.base}/${siteId}/air-quality`, {
      params: toHttpParams({ range }),
    });
  }
}
