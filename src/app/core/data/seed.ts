import {
  AirQualityReading,
  Alert,
  Device,
  DeviceStatus,
  Site,
  Telemetry,
} from '../models';
import { Rng, clamp, round } from '../util/random';
import { airQualityRating, computeAirQualityScore } from '../util/air-quality';
import {
  AnomalySignal,
  computeHealth,
  detectAnomalies,
  TelemetryTrend,
} from '../util/maintenance';

/**
 * Deterministic mock-data generator.
 *
 * Everything is derived from one seed so the fleet is identical on every load.
 * The design keeps the data *coherent*: each device gets a latent "wear" factor,
 * from which we synthesise operating telemetry; status, health score and alerts
 * are then all derived from that same telemetry via the shared heuristics — so
 * a device flagged "critical" really does have the vibration/temperature to
 * justify it, and its alerts match. Operating baselines and trends are kept
 * alongside each device for the history and live-telemetry layers to build on.
 */

const DEFAULT_SEED = 0x5f3a21;
const DEVICE_COUNT = 540; // > 500, to exercise virtual scrolling / paging

const SITE_DEFS = [
  { name: 'Helix Tower', location: 'Rotterdam, NL', region: 'EU-West' },
  { name: 'Northgate Logistics', location: 'Hamburg, DE', region: 'EU-Central' },
  { name: 'Brightworks Campus', location: 'Dublin, IE', region: 'EU-West' },
  { name: 'Summit Data Hall', location: 'Stockholm, SE', region: 'EU-North' },
  { name: 'Meridian Plant', location: 'Lyon, FR', region: 'EU-West' },
  { name: 'Eastside Atrium', location: 'Warsaw, PL', region: 'EU-East' },
] as const;

interface FanModel {
  code: string;
  baseRpm: number;
  basePowerW: number;
  baseAirflow: number;
}

const FAN_MODELS: readonly FanModel[] = [
  { code: 'AeroCore AX-900', baseRpm: 900, basePowerW: 600, baseAirflow: 1100 },
  { code: 'AeroCore AX-1400', baseRpm: 1400, basePowerW: 1100, baseAirflow: 1800 },
  { code: 'VortexPro V2', baseRpm: 1800, basePowerW: 1500, baseAirflow: 2400 },
  { code: 'TurboStream TS-30', baseRpm: 1200, basePowerW: 950, baseAirflow: 1600 },
  { code: 'CycloneMax CM-5', baseRpm: 2200, basePowerW: 1900, baseAirflow: 3000 },
];

const HOUR = 3600_000;
const DAY = 24 * HOUR;

/** Operating baseline + trend retained per device for history/live simulation. */
export interface DeviceSeed {
  device: Device;
  baseline: Telemetry;
  trend: TelemetryTrend;
}

export interface Dataset {
  generatedAt: number;
  sites: Site[];
  devices: Device[];
  deviceSeeds: Map<string, DeviceSeed>;
  alerts: Alert[];
  /** Latest air-quality reading per site id, reused as the history anchor. */
  siteAq: Map<string, AirQualityReading>;
}

function makeAirQuality(rng: Rng): AirQualityReading {
  const co2Ppm = round(rng.float(430, 1500));
  const tvocPpb = round(rng.float(60, 1300));
  const humidityPct = round(rng.float(28, 70));
  const temperatureC = round(rng.float(19, 26), 1);
  const score = computeAirQualityScore({ co2Ppm, tvocPpb, humidityPct });
  return { co2Ppm, tvocPpb, humidityPct, temperatureC, score, rating: airQualityRating(score) };
}

function makeSites(rng: Rng): { sites: Site[]; aq: Map<string, AirQualityReading> } {
  const aq = new Map<string, AirQualityReading>();
  const sites = SITE_DEFS.map((def, i): Site => {
    const id = `site-${i + 1}`;
    const airQuality = makeAirQuality(rng);
    aq.set(id, airQuality);
    return { id, ...def, deviceCount: 0, airQuality };
  });
  return { sites, aq };
}

function makeBaseline(rng: Rng, model: FanModel, wear: number): Telemetry {
  const rpm = round(model.baseRpm * rng.float(0.92, 1.06));
  const loadRatio = rpm / model.baseRpm;
  const powerW = round(model.basePowerW * loadRatio * rng.float(0.95, 1.08) * (1 + wear * 0.18));
  const temperatureC = round(
    38 + wear * 34 + (powerW / model.basePowerW - 1) * 16 + rng.gaussian(0, 3),
    1,
  );
  const vibrationMm = round(clamp(0.8 + wear * 6.8 + rng.gaussian(0, 0.35), 0.3, 12), 2);
  // ~6% of fans have a partial obstruction that starves airflow.
  const blockage = rng.bool(0.06) ? rng.float(0.4, 0.6) : rng.float(0.9, 1.05);
  const airflowM3h = round(model.baseAirflow * loadRatio * blockage);
  const runtimeHours = round(rng.float(1500, 59000));
  return { rpm, powerW, temperatureC, vibrationMm, airflowM3h, runtimeHours };
}

function makeTrend(rng: Rng, wear: number): TelemetryTrend {
  // Worn fans are far more likely to be actively degrading.
  const worsening = rng.bool(0.06 + wear * 0.4);
  return worsening
    ? {
        vibrationTrendMm: round(rng.float(0.4, 2.4), 2),
        temperatureTrendC: round(rng.float(0.6, 4), 1),
      }
    : {
        vibrationTrendMm: round(rng.float(-0.2, 0.3), 2),
        temperatureTrendC: round(rng.float(-1, 1), 1),
      };
}

function deriveStatus(
  rng: Rng,
  healthScore: number,
  anomalies: AnomalySignal[],
): DeviceStatus {
  if (rng.bool(0.04)) {
    return 'offline';
  }
  if (anomalies.some((a) => a.severity === 'critical') || healthScore < 40) {
    return 'critical';
  }
  if (anomalies.some((a) => a.severity === 'warning') || healthScore < 70) {
    return 'warning';
  }
  return 'online';
}

/** Telemetry actually shown for an offline fan: stopped, cooling to ambient. */
function offlineTelemetry(rng: Rng, runtimeHours: number): Telemetry {
  return {
    rpm: 0,
    powerW: 0,
    temperatureC: round(rng.float(17, 24), 1),
    vibrationMm: 0,
    airflowM3h: 0,
    runtimeHours,
  };
}

function makeDevices(
  rng: Rng,
  sites: Site[],
  now: number,
): { seeds: DeviceSeed[]; alerts: Alert[] } {
  const seeds: DeviceSeed[] = [];
  const alerts: Alert[] = [];
  let alertCounter = 0;

  for (let i = 0; i < DEVICE_COUNT; i++) {
    const id = `dev-${String(i + 1).padStart(4, '0')}`;
    const site = rng.pick(sites);
    const model = rng.pick(FAN_MODELS);
    // Skew wear towards healthy so the fleet is mostly green with a realistic tail.
    const wear = rng.float(0, 1) ** 1.7;

    const baseline = makeBaseline(rng, model, wear);
    const trend = makeTrend(rng, wear);
    const health = computeHealth(baseline, trend);
    const anomalies = detectAnomalies(baseline, trend);
    const status = deriveStatus(rng, health.healthScore, anomalies);

    const serial = String(rng.int(100, 9999)).padStart(4, '0');
    const installedAt = new Date(now - rng.float(60, 1500) * DAY).toISOString();
    const lastSeenAt = new Date(
      status === 'offline' ? now - rng.float(0.5, 36) * HOUR : now - rng.float(0, 90) * 1000,
    ).toISOString();

    const device: Device = {
      id,
      name: `${model.code} #${serial}`,
      model: model.code,
      siteId: site.id,
      siteName: site.name,
      status,
      telemetry: status === 'offline' ? offlineTelemetry(rng, baseline.runtimeHours) : baseline,
      health,
      installedAt,
      lastSeenAt,
    };
    seeds.push({ device, baseline, trend });
    site.deviceCount++;

    // Alerts: anomalies become alerts for running devices; offline raises its own.
    const signals: AnomalySignal[] =
      status === 'offline'
        ? [
            {
              type: 'offline',
              severity: rng.bool(0.3) ? 'critical' : 'warning',
              message: 'Device has stopped reporting telemetry.',
            },
          ]
        : anomalies;

    for (const signal of signals) {
      const createdAt = new Date(now - rng.float(0, 6) ** 2 * HOUR).toISOString();
      alerts.push({
        id: `alert-${++alertCounter}`,
        deviceId: device.id,
        deviceName: device.name,
        siteId: site.id,
        siteName: site.name,
        severity: signal.severity,
        type: signal.type,
        message: signal.message,
        createdAt,
        acknowledged: rng.bool(0.4),
        acknowledgedAt: null,
      });
    }
  }

  return { seeds, alerts };
}

function makeAirQualityAlerts(
  rng: Rng,
  sites: Site[],
  seeds: DeviceSeed[],
  now: number,
  startId: number,
): Alert[] {
  const alerts: Alert[] = [];
  let counter = startId;
  for (const site of sites) {
    if (site.airQuality.rating !== 'poor') {
      continue;
    }
    const sensor = seeds.find((s) => s.device.siteId === site.id)?.device;
    if (!sensor) {
      continue;
    }
    alerts.push({
      id: `alert-${++counter}`,
      deviceId: sensor.id,
      deviceName: sensor.name,
      siteId: site.id,
      siteName: site.name,
      severity: 'warning',
      type: 'air_quality',
      message: `Air quality at ${site.name} is poor (CO₂ ${site.airQuality.co2Ppm} ppm).`,
      createdAt: new Date(now - rng.float(0.5, 8) * HOUR).toISOString(),
      acknowledged: false,
      acknowledgedAt: null,
    });
  }
  return alerts;
}

/** Build the full mock dataset. The same seed always yields the same fleet. */
export function buildDataset(seed = DEFAULT_SEED): Dataset {
  const rng = new Rng(seed);
  const now = Date.now();

  const { sites, aq } = makeSites(rng);
  const { seeds, alerts } = makeDevices(rng, sites, now);
  alerts.push(...makeAirQualityAlerts(rng, sites, seeds, now, alerts.length));

  // Newest alerts first — the natural order for a feed.
  alerts.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));

  const deviceSeeds = new Map(seeds.map((s) => [s.device.id, s]));
  return {
    generatedAt: now,
    sites,
    devices: seeds.map((s) => s.device),
    deviceSeeds,
    alerts,
    siteAq: aq,
  };
}
