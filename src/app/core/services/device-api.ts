import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { Device, DeviceHistory, DeviceQuery, Paged, TimeRange } from '../models';
import { toHttpParams } from '../util/http';

/** Data access for devices and their telemetry history. */
@Injectable({ providedIn: 'root' })
export class DeviceApi {
  private readonly http = inject(HttpClient);
  private readonly base = '/api/devices';

  getDevices(query: DeviceQuery = {}): Observable<Paged<Device>> {
    return this.http.get<Paged<Device>>(this.base, { params: toHttpParams({ ...query }) });
  }

  getDevice(id: string): Observable<Device> {
    return this.http.get<Device>(`${this.base}/${id}`);
  }

  getHistory(id: string, range: TimeRange): Observable<DeviceHistory> {
    return this.http.get<DeviceHistory>(`${this.base}/${id}/history`, {
      params: toHttpParams({ range }),
    });
  }
}
