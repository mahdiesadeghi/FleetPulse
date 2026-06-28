import {
  HttpErrorResponse,
  HttpEvent,
  HttpInterceptorFn,
  HttpParams,
  HttpResponse,
} from '@angular/common/http';
import { Observable, mergeMap, of, throwError, timer } from 'rxjs';

import {
  AlertQuery,
  DeviceInput,
  DeviceQuery,
  DeviceSortField,
  DeviceStatus,
  SortDir,
  TimeRange,
} from '../models';
import { MockDb } from '../data/mock-db';

/**
 * Mock REST API.
 *
 * Services make ordinary `HttpClient` calls to `/api/...`; this interceptor is
 * the only thing standing in for a backend. Because it is a real interceptor,
 * swapping in a live API later means deleting it from `app.config.ts` — nothing
 * in the feature code changes. Requests get a small simulated latency so loading
 * and skeleton states are exercised.
 */

const db = new MockDb();

const API_PREFIX = '/api/';
const MIN_LATENCY_MS = 120;
const MAX_LATENCY_MS = 340;

function latency(): number {
  return MIN_LATENCY_MS + Math.random() * (MAX_LATENCY_MS - MIN_LATENCY_MS);
}

function ok<T>(body: T): Observable<HttpEvent<T>> {
  return of(new HttpResponse({ status: 200, body })).pipe(
    mergeMap((res) => timer(latency()).pipe(mergeMap(() => of(res)))),
  );
}

function fail(status: number, message: string, url: string): Observable<never> {
  return timer(latency()).pipe(
    mergeMap(() =>
      throwError(() => new HttpErrorResponse({ status, statusText: message, url, error: message })),
    ),
  );
}

function pathSegments(url: string): string[] {
  const pathname = url.startsWith('http') ? new URL(url).pathname : url.split('?')[0];
  const idx = pathname.indexOf(API_PREFIX);
  return pathname
    .slice(idx + API_PREFIX.length)
    .split('/')
    .filter(Boolean);
}

function num(value: string | null): number | undefined {
  return value === null ? undefined : Number(value);
}

function bool(value: string | null): boolean | undefined {
  return value === null ? undefined : value === 'true';
}

function range(params: HttpParams): TimeRange {
  return (params.get('range') as TimeRange | null) ?? '24h';
}

function toDeviceQuery(params: HttpParams): DeviceQuery {
  return {
    search: params.get('search') ?? undefined,
    siteId: params.get('siteId') ?? undefined,
    status: (params.get('status') as DeviceStatus | null) ?? undefined,
    sort: (params.get('sort') as DeviceSortField | null) ?? undefined,
    dir: (params.get('dir') as SortDir | null) ?? undefined,
    page: num(params.get('page')),
    pageSize: num(params.get('pageSize')),
  };
}

function toAlertQuery(params: HttpParams): AlertQuery {
  return {
    severity: (params.get('severity') as AlertQuery['severity']) ?? undefined,
    siteId: params.get('siteId') ?? undefined,
    deviceId: params.get('deviceId') ?? undefined,
    type: (params.get('type') as AlertQuery['type']) ?? undefined,
    acknowledged: bool(params.get('acknowledged')),
  };
}

export const mockApiInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.includes(API_PREFIX)) {
    return next(req);
  }

  const seg = pathSegments(req.url);
  const { method, params } = req;

  // GET /api/overview
  if (method === 'GET' && seg[0] === 'overview' && seg.length === 1) {
    return ok(db.getOverview());
  }

  // GET /api/sites  |  GET /api/sites/:id/air-quality
  if (method === 'GET' && seg[0] === 'sites') {
    if (seg.length === 1) {
      return ok(db.getSites());
    }
    if (seg.length === 3 && seg[2] === 'air-quality') {
      const history = db.getSiteAqHistory(seg[1], range(params));
      return history ? ok(history) : fail(404, 'Site not found', req.url);
    }
  }

  // /api/devices  (list + create)
  // /api/devices/:id  (read + update + delete)
  // /api/devices/:id/history
  if (seg[0] === 'devices') {
    if (seg.length === 1) {
      if (method === 'GET') {
        return ok(db.queryDevices(toDeviceQuery(params)));
      }
      if (method === 'POST') {
        const created = db.createDevice(req.body as DeviceInput);
        return created ? ok(created) : fail(400, 'Invalid device payload', req.url);
      }
    }
    if (seg.length === 2) {
      if (method === 'GET') {
        const device = db.getDevice(seg[1]);
        return device ? ok(device) : fail(404, 'Device not found', req.url);
      }
      if (method === 'PUT') {
        const updated = db.updateDevice(seg[1], req.body as DeviceInput);
        return updated ? ok(updated) : fail(404, 'Device not found', req.url);
      }
      if (method === 'DELETE') {
        return db.deleteDevice(seg[1]) ? ok({ id: seg[1] }) : fail(404, 'Device not found', req.url);
      }
    }
    if (method === 'GET' && seg.length === 3 && seg[2] === 'history') {
      const history = db.getDeviceHistory(seg[1], range(params));
      return history ? ok(history) : fail(404, 'Device not found', req.url);
    }
  }

  // GET /api/alerts  |  POST /api/alerts/:id/ack
  if (seg[0] === 'alerts') {
    if (method === 'GET' && seg.length === 1) {
      return ok(db.queryAlerts(toAlertQuery(params)));
    }
    if (method === 'POST' && seg.length === 3 && seg[2] === 'ack') {
      const alert = db.acknowledgeAlert(seg[1]);
      return alert ? ok(alert) : fail(404, 'Alert not found', req.url);
    }
  }

  return fail(404, 'Not found', req.url);
};
