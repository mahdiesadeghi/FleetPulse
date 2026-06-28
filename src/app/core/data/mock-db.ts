import {
  Alert,
  AlertQuery,
  Device,
  DeviceHistory,
  DeviceInput,
  DeviceQuery,
  DeviceSortField,
  DEVICE_STATUSES,
  FleetOverview,
  Paged,
  Site,
  SiteAqHistory,
  SortDir,
  Telemetry,
  TimeRange,
} from '../models';
import { AnomalySignal, computeHealth, detectAnomalies, TelemetryTrend } from '../util/maintenance';
import { buildDataset, Dataset, DeviceSeed } from './seed';
import { generateDeviceHistory, generateEnergySeries, generateSiteAqHistory } from './history';

/** Manually created/edited devices have no recent trend yet. */
const NO_TREND: TelemetryTrend = { vibrationTrendMm: 0, temperatureTrendC: 0 };

/** Parse the numeric suffix of an id like `dev-0042` or `alert-7`. */
function idSeq(id: string): number {
  const n = Number(id.split('-').pop());
  return Number.isFinite(n) ? n : 0;
}

/**
 * In-memory "database" backing the mock REST API. It owns the generated dataset
 * and exposes query/mutation methods that mirror what a real backend would do
 * (filter, sort, paginate, acknowledge). The HTTP interceptor is a thin adapter
 * over this class, which keeps the request-handling and the data logic separate
 * and makes the DB unit-testable on its own.
 */
export class MockDb {
  private readonly data: Dataset;
  // Running sequences so created devices/alerts keep getting unique ids.
  private deviceSeq: number;
  private alertSeq: number;

  constructor(seed?: number) {
    this.data = buildDataset(seed);
    this.deviceSeq = this.data.devices.reduce((max, d) => Math.max(max, idSeq(d.id)), 0);
    this.alertSeq = this.data.alerts.reduce((max, a) => Math.max(max, idSeq(a.id)), 0);
  }

  getSites(): Site[] {
    return this.data.sites;
  }

  getDevice(id: string): Device | undefined {
    return this.data.deviceSeeds.get(id)?.device;
  }

  /**
   * Create a device. Health is derived from the supplied telemetry via the same
   * heuristic the seed uses; the owning site's count and any anomaly alerts are
   * updated too, so every other view stays consistent on its next fetch.
   */
  createDevice(input: DeviceInput): Device | undefined {
    const site = this.data.sites.find((s) => s.id === input.siteId);
    if (!site) {
      return undefined;
    }
    this.deviceSeq += 1;
    const id = `dev-${String(this.deviceSeq).padStart(4, '0')}`;
    const now = new Date().toISOString();
    const device = this.composeDevice(id, input, site.name, now, now);
    const seed: DeviceSeed = { device, baseline: { ...input.telemetry }, trend: NO_TREND };

    this.data.deviceSeeds.set(id, seed);
    this.data.devices.push(device);
    site.deviceCount += 1;
    this.rebuildDeviceAlerts(device, seed.baseline);
    return device;
  }

  /** Update a device in place; recompute health, fix site counts, refresh alerts. */
  updateDevice(id: string, input: DeviceInput): Device | undefined {
    const seed = this.data.deviceSeeds.get(id);
    const site = this.data.sites.find((s) => s.id === input.siteId);
    if (!seed || !site) {
      return undefined;
    }
    const device = seed.device;

    if (device.siteId !== input.siteId) {
      const previous = this.data.sites.find((s) => s.id === device.siteId);
      if (previous) {
        previous.deviceCount -= 1;
      }
      site.deviceCount += 1;
    }

    device.name = input.name;
    device.model = input.model;
    device.siteId = input.siteId;
    device.siteName = site.name;
    device.status = input.status;
    device.health = computeHealth(input.telemetry, NO_TREND);
    device.telemetry =
      input.status === 'offline' ? this.stoppedTelemetry(input.telemetry) : { ...input.telemetry };
    device.lastSeenAt = new Date().toISOString();

    seed.baseline = { ...input.telemetry };
    seed.trend = NO_TREND;
    this.rebuildDeviceAlerts(device, seed.baseline);
    return device;
  }

  /** Delete a device along with its alerts; decrement the site count. */
  deleteDevice(id: string): boolean {
    const seed = this.data.deviceSeeds.get(id);
    if (!seed) {
      return false;
    }
    this.data.deviceSeeds.delete(id);
    const index = this.data.devices.findIndex((d) => d.id === id);
    if (index >= 0) {
      this.data.devices.splice(index, 1);
    }
    const site = this.data.sites.find((s) => s.id === seed.device.siteId);
    if (site) {
      site.deviceCount -= 1;
    }
    this.removeDeviceAlerts(id);
    return true;
  }

  private composeDevice(
    id: string,
    input: DeviceInput,
    siteName: string,
    installedAt: string,
    lastSeenAt: string,
  ): Device {
    return {
      id,
      name: input.name,
      model: input.model,
      siteId: input.siteId,
      siteName,
      status: input.status,
      telemetry:
        input.status === 'offline' ? this.stoppedTelemetry(input.telemetry) : { ...input.telemetry },
      health: computeHealth(input.telemetry, NO_TREND),
      installedAt,
      lastSeenAt,
    };
  }

  /** A stopped fan reports zeros; the entered values live on as the baseline. */
  private stoppedTelemetry(t: Telemetry): Telemetry {
    return {
      rpm: 0,
      powerW: 0,
      temperatureC: t.temperatureC,
      vibrationMm: 0,
      airflowM3h: 0,
      runtimeHours: t.runtimeHours,
    };
  }

  /** Replace a device's alerts based on its current status/telemetry. */
  private rebuildDeviceAlerts(device: Device, baseline: Telemetry): void {
    this.removeDeviceAlerts(device.id);
    const signals: AnomalySignal[] =
      device.status === 'offline'
        ? [{ type: 'offline', severity: 'warning', message: 'Device has stopped reporting telemetry.' }]
        : detectAnomalies(baseline, NO_TREND);

    const now = new Date().toISOString();
    for (const signal of signals) {
      this.alertSeq += 1;
      // Newest first — the order the feed expects.
      this.data.alerts.unshift({
        id: `alert-${this.alertSeq}`,
        deviceId: device.id,
        deviceName: device.name,
        siteId: device.siteId,
        siteName: device.siteName,
        severity: signal.severity,
        type: signal.type,
        message: signal.message,
        createdAt: now,
        acknowledged: false,
        acknowledgedAt: null,
      });
    }
  }

  private removeDeviceAlerts(id: string): void {
    this.data.alerts = this.data.alerts.filter((a) => a.deviceId !== id);
  }

  queryDevices(query: DeviceQuery): Paged<Device> {
    const page = query.page ?? 0;
    const pageSize = query.pageSize ?? 25;

    let items = this.data.devices;

    if (query.search) {
      const term = query.search.toLowerCase();
      items = items.filter(
        (d) =>
          d.name.toLowerCase().includes(term) ||
          d.model.toLowerCase().includes(term) ||
          d.siteName.toLowerCase().includes(term),
      );
    }
    if (query.siteId) {
      items = items.filter((d) => d.siteId === query.siteId);
    }
    if (query.status) {
      items = items.filter((d) => d.status === query.status);
    }

    if (query.sort) {
      items = this.sortDevices(items, query.sort, query.dir ?? 'asc');
    }

    const total = items.length;
    const start = page * pageSize;
    return { items: items.slice(start, start + pageSize), total, page, pageSize };
  }

  private sortDevices(devices: Device[], field: DeviceSortField, dir: SortDir): Device[] {
    const factor = dir === 'asc' ? 1 : -1;
    const valueOf = (d: Device): string | number => {
      switch (field) {
        case 'name':
          return d.name;
        case 'siteName':
          return d.siteName;
        case 'status':
          return DEVICE_STATUSES.indexOf(d.status);
        case 'temperatureC':
          return d.telemetry.temperatureC;
        case 'powerW':
          return d.telemetry.powerW;
        case 'healthScore':
          return d.health.healthScore;
      }
    };
    // Copy before sorting so we never mutate the source collection.
    return [...devices].sort((a, b) => {
      const av = valueOf(a);
      const bv = valueOf(b);
      if (typeof av === 'string' && typeof bv === 'string') {
        return av.localeCompare(bv) * factor;
      }
      return ((av as number) - (bv as number)) * factor;
    });
  }

  queryAlerts(query: AlertQuery): Alert[] {
    return this.data.alerts.filter((a) => {
      if (query.severity && a.severity !== query.severity) {
        return false;
      }
      if (query.siteId && a.siteId !== query.siteId) {
        return false;
      }
      if (query.deviceId && a.deviceId !== query.deviceId) {
        return false;
      }
      if (query.type && a.type !== query.type) {
        return false;
      }
      if (query.acknowledged !== undefined && a.acknowledged !== query.acknowledged) {
        return false;
      }
      return true;
    });
  }

  acknowledgeAlert(id: string): Alert | undefined {
    const alert = this.data.alerts.find((a) => a.id === id);
    if (!alert || alert.acknowledged) {
      return alert;
    }
    alert.acknowledged = true;
    alert.acknowledgedAt = new Date().toISOString();
    return alert;
  }

  getOverview(): FleetOverview {
    const devices = this.data.devices;
    const total = devices.length;
    const offlineCount = devices.filter((d) => d.status === 'offline').length;
    // "Online" here means reachable (reporting), i.e. anything that isn't offline.
    const onlineCount = total - offlineCount;

    const openAlerts = this.data.alerts.filter((a) => !a.acknowledged);
    const fleetEnergyKw =
      Math.round(devices.reduce((sum, d) => sum + d.telemetry.powerW, 0) / 100) / 10;
    const avgAqScore = Math.round(
      this.data.sites.reduce((sum, s) => sum + s.airQuality.score, 0) / this.data.sites.length,
    );

    const statusBreakdown = DEVICE_STATUSES.map((status) => ({
      status,
      count: devices.filter((d) => d.status === status).length,
    }));

    const topIssues = [...devices]
      .sort((a, b) => a.health.healthScore - b.health.healthScore)
      .slice(0, 7);

    return {
      kpis: {
        totalDevices: total,
        onlineCount,
        onlinePct: Math.round((onlineCount / total) * 100),
        activeAlerts: openAlerts.length,
        criticalAlerts: openAlerts.filter((a) => a.severity === 'critical').length,
        fleetEnergyKw,
        avgAqScore,
      },
      statusBreakdown,
      energySeries: generateEnergySeries(fleetEnergyKw, '24h', Date.now()),
      topIssues,
    };
  }

  getDeviceHistory(id: string, range: TimeRange): DeviceHistory | undefined {
    const seed = this.data.deviceSeeds.get(id);
    return seed ? generateDeviceHistory(seed, range, Date.now()) : undefined;
  }

  getSiteAqHistory(siteId: string, range: TimeRange): SiteAqHistory | undefined {
    const reading = this.data.siteAq.get(siteId);
    return reading ? generateSiteAqHistory(siteId, reading, range, Date.now()) : undefined;
  }
}
