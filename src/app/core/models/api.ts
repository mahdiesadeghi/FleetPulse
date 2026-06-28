import { AqMetric } from './air-quality';
import { Device, DeviceStatus, Telemetry, TelemetryMetric } from './device';
import { AlertSeverity, AlertType } from './alert';
import { SortDir, TimeSeriesPoint } from './common';

/** Generic paged response envelope returned by list endpoints. */
export interface Paged<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

/** Selectable historical window for time-series endpoints. */
export const TIME_RANGES = ['1h', '6h', '24h', '7d'] as const;
export type TimeRange = (typeof TIME_RANGES)[number];

export type DeviceSortField =
  | 'name'
  | 'siteName'
  | 'status'
  | 'temperatureC'
  | 'powerW'
  | 'healthScore';

/** Payload for creating or updating a device (`POST`/`PUT /api/devices`). */
export interface DeviceInput {
  name: string;
  model: string;
  siteId: string;
  status: DeviceStatus;
  telemetry: Telemetry;
}

/** Query parameters accepted by `GET /api/devices`. */
export interface DeviceQuery {
  search?: string;
  siteId?: string;
  status?: DeviceStatus;
  sort?: DeviceSortField;
  dir?: SortDir;
  page?: number;
  pageSize?: number;
}

/** Query parameters accepted by `GET /api/alerts`. */
export interface AlertQuery {
  severity?: AlertSeverity;
  siteId?: string;
  deviceId?: string;
  type?: AlertType;
  /** `true` → acknowledged only, `false` → open only, omitted → all. */
  acknowledged?: boolean;
}

/** Headline KPIs shown on the overview dashboard. */
export interface OverviewKpis {
  totalDevices: number;
  onlineCount: number;
  onlinePct: number;
  activeAlerts: number;
  criticalAlerts: number;
  /** Current fleet-wide power draw, kilowatts. */
  fleetEnergyKw: number;
  avgAqScore: number;
}

/** Everything the overview dashboard needs, in a single response. */
export interface FleetOverview {
  kpis: OverviewKpis;
  statusBreakdown: { status: DeviceStatus; count: number }[];
  /** Fleet energy over the last 24h, kW. */
  energySeries: TimeSeriesPoint[];
  /** Devices most in need of attention (lowest health / open criticals). */
  topIssues: Device[];
}

/** Historical telemetry for one device, keyed by metric. */
export interface DeviceHistory {
  deviceId: string;
  range: TimeRange;
  series: Record<TelemetryMetric, TimeSeriesPoint[]>;
}

/** Historical air-quality for one site, keyed by metric. */
export interface SiteAqHistory {
  siteId: string;
  range: TimeRange;
  series: Record<AqMetric, TimeSeriesPoint[]>;
}
