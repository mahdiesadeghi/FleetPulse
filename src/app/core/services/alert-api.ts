import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { Alert, AlertQuery } from '../models';
import { toHttpParams } from '../util/http';

/** Data access for the fleet-wide alert feed. */
@Injectable({ providedIn: 'root' })
export class AlertApi {
  private readonly http = inject(HttpClient);
  private readonly base = '/api/alerts';

  getAlerts(query: AlertQuery = {}): Observable<Alert[]> {
    return this.http.get<Alert[]>(this.base, {
      params: toHttpParams({ ...query }),
    });
  }

  acknowledge(id: string): Observable<Alert> {
    return this.http.post<Alert>(`${this.base}/${id}/ack`, {});
  }
}
