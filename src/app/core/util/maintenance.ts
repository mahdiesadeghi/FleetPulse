import { AlertSeverity, AlertType, MaintenanceHealth, Telemetry } from '../models';
import { clamp, round } from './random';

/**
 * Predictive-maintenance heuristic.
 *
 * A transparent rule-based stand-in for an ML model. It scores device health
 * from the current telemetry plus short-term trends (rate of change), estimates
 * remaining useful life, and raises anomaly signals. Thresholds are named
 * constants loosely based on ISO 10816 vibration bands and typical motor limits
 * so the behaviour is explainable and easy to tune.
 */

/** Recent rate-of-change for the channels that predict failure. */
export interface TelemetryTrend {
  /** Vibration change (mm/s) across the trend window — rising = bearing wear. */
  vibrationTrendMm: number;
  /** Temperature change (°C) across the trend window. */
  temperatureTrendC: number;
}

const NOMINAL_TEMP_C = 55;
const CRITICAL_TEMP_C = 85;
const NOMINAL_VIBRATION_MM = 2.8; // ISO 10816 "good"
const CRITICAL_VIBRATION_MM = 7.1; // ISO 10816 "unacceptable"
const DESIGN_LIFE_HOURS = 60_000;

/** Health penalty (points) for running hotter than nominal. */
function temperaturePenalty(temperatureC: number): number {
  const ratio = (temperatureC - NOMINAL_TEMP_C) / (CRITICAL_TEMP_C - NOMINAL_TEMP_C);
  return clamp(ratio * 45, 0, 45);
}

/** Health penalty (points) for vibration above nominal — the strongest signal. */
function vibrationPenalty(vibrationMm: number): number {
  const ratio = (vibrationMm - NOMINAL_VIBRATION_MM) / (CRITICAL_VIBRATION_MM - NOMINAL_VIBRATION_MM);
  return clamp(ratio * 50, 0, 50);
}

/** Extra penalty when things are actively getting worse. */
function trendPenalty(trend: TelemetryTrend): number {
  return clamp(trend.vibrationTrendMm * 6, 0, 15) + clamp(trend.temperatureTrendC * 1.2, 0, 10);
}

/** Cumulative wear from total runtime. */
function wearPenalty(runtimeHours: number): number {
  return clamp((runtimeHours / DESIGN_LIFE_HOURS) * 20, 0, 20);
}

/** 0–100 health score (higher is healthier). */
export function computeHealthScore(telemetry: Telemetry, trend: TelemetryTrend): number {
  const score =
    100 -
    temperaturePenalty(telemetry.temperatureC) -
    vibrationPenalty(telemetry.vibrationMm) -
    trendPenalty(trend) -
    wearPenalty(telemetry.runtimeHours);
  return round(clamp(score, 0, 100));
}

/** Estimate remaining useful life (days) from health and accumulated runtime. */
export function estimateRemainingUsefulLifeDays(
  healthScore: number,
  runtimeHours: number,
): number {
  const designDaysLeft = clamp((DESIGN_LIFE_HOURS - runtimeHours) / 24, 0, DESIGN_LIFE_HOURS / 24);
  // RUL collapses faster than health does, so use a >1 exponent.
  const healthFactor = (healthScore / 100) ** 1.5;
  return round(clamp(designDaysLeft * healthFactor, 0, 3650));
}

/** Convenience wrapper returning the full maintenance-health record. */
export function computeHealth(telemetry: Telemetry, trend: TelemetryTrend): MaintenanceHealth {
  const healthScore = computeHealthScore(telemetry, trend);
  return {
    healthScore,
    remainingUsefulLifeDays: estimateRemainingUsefulLifeDays(healthScore, telemetry.runtimeHours),
  };
}

/** A detected anomaly, before it is turned into a persisted {@link Alert}. */
export interface AnomalySignal {
  type: AlertType;
  severity: AlertSeverity;
  message: string;
}

/**
 * Inspect telemetry + trends and emit anomaly signals. Each rule maps to one
 * alert type so the device-detail and alerts views can group/filter them.
 */
export function detectAnomalies(telemetry: Telemetry, trend: TelemetryTrend): AnomalySignal[] {
  const signals: AnomalySignal[] = [];

  // Vibration: the clearest predictor of mechanical failure.
  if (telemetry.vibrationMm >= CRITICAL_VIBRATION_MM) {
    signals.push({
      type: 'rising_vibration',
      severity: 'critical',
      message: `Vibration ${telemetry.vibrationMm.toFixed(1)} mm/s exceeds the critical limit (${CRITICAL_VIBRATION_MM} mm/s).`,
    });
  } else if (trend.vibrationTrendMm >= 1.2 && telemetry.vibrationMm >= NOMINAL_VIBRATION_MM) {
    signals.push({
      type: 'rising_vibration',
      severity: 'warning',
      message: `Vibration trending up by ${trend.vibrationTrendMm.toFixed(1)} mm/s — possible bearing wear.`,
    });
  }

  // Temperature.
  if (telemetry.temperatureC >= CRITICAL_TEMP_C) {
    signals.push({
      type: 'overheating',
      severity: 'critical',
      message: `Motor temperature ${Math.round(telemetry.temperatureC)} °C above the critical limit (${CRITICAL_TEMP_C} °C).`,
    });
  } else if (telemetry.temperatureC >= NOMINAL_TEMP_C + 15 && trend.temperatureTrendC > 0) {
    signals.push({
      type: 'overheating',
      severity: 'warning',
      message: `Motor running hot at ${Math.round(telemetry.temperatureC)} °C and still climbing.`,
    });
  }

  // Power draw — sustained over-current suggests strain or electrical fault.
  if (telemetry.powerW >= 2200) {
    signals.push({
      type: 'power_anomaly',
      severity: 'warning',
      message: `Power draw ${Math.round(telemetry.powerW)} W is unusually high for this model.`,
    });
  }

  // Airflow well below what the current RPM should deliver implies a blockage.
  if (telemetry.rpm > 800 && telemetry.airflowM3h < telemetry.rpm * 0.5) {
    signals.push({
      type: 'low_airflow',
      severity: 'warning',
      message: `Airflow ${Math.round(telemetry.airflowM3h)} m³/h is low for ${Math.round(telemetry.rpm)} rpm — check for obstruction.`,
    });
  }

  return signals;
}
