/** Alert severity, ascending. */
export const ALERT_SEVERITIES = ['info', 'warning', 'critical'] as const;
export type AlertSeverity = (typeof ALERT_SEVERITIES)[number];

/** Categories of anomaly the maintenance heuristic can raise. */
export const ALERT_TYPES = [
  'rising_vibration',
  'overheating',
  'power_anomaly',
  'low_airflow',
  'offline',
  'air_quality',
] as const;
export type AlertType = (typeof ALERT_TYPES)[number];

/** An anomaly / maintenance alert raised against a device. */
export interface Alert {
  id: string;
  deviceId: string;
  deviceName: string;
  siteId: string;
  siteName: string;
  severity: AlertSeverity;
  type: AlertType;
  message: string;
  createdAt: string;
  acknowledged: boolean;
  acknowledgedAt: string | null;
}
