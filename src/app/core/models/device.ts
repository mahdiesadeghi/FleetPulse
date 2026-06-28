import { MaintenanceHealth } from './maintenance';

/** Operational status of a device, ordered by increasing severity. */
export const DEVICE_STATUSES = ['online', 'warning', 'critical', 'offline'] as const;
export type DeviceStatus = (typeof DEVICE_STATUSES)[number];

/**
 * Live telemetry sample for a smart fan / motor.
 * Units are encoded in the field names to keep the model self-documenting.
 */
export interface Telemetry {
  rpm: number;
  powerW: number;
  temperatureC: number;
  /** Vibration velocity, mm/s (ISO 10816-style). */
  vibrationMm: number;
  /** Airflow, cubic metres per hour. */
  airflowM3h: number;
  /** Cumulative motor runtime, hours. */
  runtimeHours: number;
}

/** The numeric telemetry channels that can be charted as a time-series. */
export const TELEMETRY_METRICS = [
  'temperatureC',
  'vibrationMm',
  'powerW',
  'rpm',
  'airflowM3h',
] as const;
export type TelemetryMetric = (typeof TELEMETRY_METRICS)[number];

/** A connected industrial fan / motor. */
export interface Device {
  id: string;
  name: string;
  model: string;
  siteId: string;
  /** Denormalised for list rendering without a second lookup. */
  siteName: string;
  status: DeviceStatus;
  telemetry: Telemetry;
  health: MaintenanceHealth;
  installedAt: string;
  lastSeenAt: string;
}
