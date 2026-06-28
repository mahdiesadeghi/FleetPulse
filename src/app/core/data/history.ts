import {
  AirQualityReading,
  DeviceHistory,
  SiteAqHistory,
  TELEMETRY_METRICS,
  TelemetryMetric,
  TimeRange,
  TimeSeriesPoint,
} from '../models';
import { Rng, clamp, round } from '../util/random';
import { computeAirQualityScore } from '../util/air-quality';
import { TelemetryTrend } from '../util/maintenance';
import { DeviceSeed } from './seed';

/**
 * On-demand, deterministic time-series synthesis.
 *
 * Rather than holding millions of pre-generated points in memory, histories are
 * regenerated per request from each device's operating baseline + trend, keyed
 * by a stable hash so the same request always returns the same curve. Series end
 * at the current value (so detail charts line up with the live tiles), ramp back
 * along the trend, and carry a daily load wave plus noise.
 */

const HOUR = 3600_000;
const DAY = 24 * HOUR;

const RANGE_CONFIG: Record<TimeRange, { points: number; stepMs: number }> = {
  '1h': { points: 60, stepMs: 60_000 },
  '6h': { points: 72, stepMs: 5 * 60_000 },
  '24h': { points: 96, stepMs: 15 * 60_000 },
  '7d': { points: 168, stepMs: HOUR },
};

function hashSeed(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Smooth daily occupancy wave in [-1, 1], peaking early afternoon. */
function dailyWave(t: number): number {
  const d = new Date(t);
  const hour = d.getHours() + d.getMinutes() / 60;
  return Math.sin(((hour - 8) / 24) * 2 * Math.PI);
}

interface SeriesParams {
  anchor: number;
  drift: number;
  noise: number;
  dailyAmp: number;
  min: number;
  max: number;
  decimals: number;
}

function buildSeries(
  rng: Rng,
  now: number,
  points: number,
  stepMs: number,
  p: SeriesParams,
): TimeSeriesPoint[] {
  const start = p.anchor - p.drift;
  const series: TimeSeriesPoint[] = [];
  for (let k = 0; k < points; k++) {
    const t = now - (points - 1 - k) * stepMs;
    const frac = points === 1 ? 1 : k / (points - 1);
    const value =
      start + p.drift * frac + p.dailyAmp * dailyWave(t) + rng.gaussian(0, p.noise);
    series.push({ t, v: round(clamp(value, p.min, p.max), p.decimals) });
  }
  return series;
}

function telemetryParams(
  metric: TelemetryMetric,
  anchor: number,
  trend: TelemetryTrend,
  rangeDays: number,
): SeriesParams {
  switch (metric) {
    case 'temperatureC':
      return {
        anchor,
        drift: trend.temperatureTrendC * rangeDays,
        noise: 1.2,
        dailyAmp: 2,
        min: 10,
        max: 130,
        decimals: 1,
      };
    case 'vibrationMm':
      return {
        anchor,
        drift: trend.vibrationTrendMm * rangeDays,
        noise: 0.16,
        dailyAmp: 0.05,
        min: 0.1,
        max: 14,
        decimals: 2,
      };
    case 'powerW':
      return { anchor, drift: 0, noise: anchor * 0.03, dailyAmp: anchor * 0.06, min: 0, max: anchor * 1.6 + 50, decimals: 0 };
    case 'rpm':
      return { anchor, drift: 0, noise: anchor * 0.02, dailyAmp: anchor * 0.03, min: 0, max: anchor * 1.4 + 50, decimals: 0 };
    case 'airflowM3h':
      return { anchor, drift: 0, noise: anchor * 0.03, dailyAmp: anchor * 0.05, min: 0, max: anchor * 1.5 + 50, decimals: 0 };
  }
}

/** Once a fan goes offline its channels collapse to a stopped state. */
function rampTailToOffline(
  series: TimeSeriesPoint[],
  metric: TelemetryMetric,
  ambientTemp: number,
): void {
  const target = metric === 'temperatureC' ? ambientTemp : 0;
  const tail = Math.max(2, Math.round(series.length * 0.05));
  for (let i = series.length - tail; i < series.length; i++) {
    const f = (i - (series.length - tail)) / (tail - 1);
    series[i] = { t: series[i].t, v: round(series[i].v * (1 - f) + target * f, 2) };
  }
}

export function generateDeviceHistory(
  seed: DeviceSeed,
  range: TimeRange,
  now: number,
): DeviceHistory {
  const { points, stepMs } = RANGE_CONFIG[range];
  const rangeDays = (points * stepMs) / DAY;
  const isOffline = seed.device.status === 'offline';
  const ambientTemp = seed.device.telemetry.temperatureC;

  const series = {} as Record<TelemetryMetric, TimeSeriesPoint[]>;
  for (const metric of TELEMETRY_METRICS) {
    const rng = new Rng(hashSeed(`${seed.device.id}:${metric}:${range}`));
    const params = telemetryParams(metric, seed.baseline[metric], seed.trend, rangeDays);
    const points$ = buildSeries(rng, now, points, stepMs, params);
    if (isOffline) {
      rampTailToOffline(points$, metric, ambientTemp);
    }
    series[metric] = points$;
  }
  return { deviceId: seed.device.id, range, series };
}

export function generateSiteAqHistory(
  siteId: string,
  reading: AirQualityReading,
  range: TimeRange,
  now: number,
): SiteAqHistory {
  const { points, stepMs } = RANGE_CONFIG[range];

  const co2Rng = new Rng(hashSeed(`${siteId}:co2:${range}`));
  const tvocRng = new Rng(hashSeed(`${siteId}:tvoc:${range}`));
  const humRng = new Rng(hashSeed(`${siteId}:hum:${range}`));

  const co2Ppm = buildSeries(co2Rng, now, points, stepMs, {
    anchor: reading.co2Ppm,
    drift: 0,
    noise: 35,
    dailyAmp: 160,
    min: 400,
    max: 2500,
    decimals: 0,
  });
  const tvocPpb = buildSeries(tvocRng, now, points, stepMs, {
    anchor: reading.tvocPpb,
    drift: 0,
    noise: 30,
    dailyAmp: 120,
    min: 20,
    max: 3000,
    decimals: 0,
  });
  const humidityPct = buildSeries(humRng, now, points, stepMs, {
    anchor: reading.humidityPct,
    drift: 0,
    noise: 1.5,
    dailyAmp: 4,
    min: 10,
    max: 95,
    decimals: 1,
  });
  // The score series is derived point-by-point so it stays consistent with the
  // raw channels (same function the live reading uses).
  const score = co2Ppm.map((p, i) => ({
    t: p.t,
    v: computeAirQualityScore({
      co2Ppm: p.v,
      tvocPpb: tvocPpb[i].v,
      humidityPct: humidityPct[i].v,
    }),
  }));

  return { siteId, range, series: { co2Ppm, tvocPpb, humidityPct, score } };
}

/** Fleet-wide energy draw (kW) over the window, with a daily demand curve. */
export function generateEnergySeries(
  fleetBaseKw: number,
  range: TimeRange,
  now: number,
): TimeSeriesPoint[] {
  const { points, stepMs } = RANGE_CONFIG[range];
  const rng = new Rng(hashSeed(`fleet-energy:${range}`));
  return buildSeries(rng, now, points, stepMs, {
    anchor: fleetBaseKw,
    drift: 0,
    noise: fleetBaseKw * 0.02,
    dailyAmp: fleetBaseKw * 0.16,
    min: 0,
    max: fleetBaseKw * 2,
    decimals: 1,
  });
}
