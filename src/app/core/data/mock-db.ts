import {
  Alert,
  AlertQuery,
  Device,
  DeviceHistory,
  DeviceQuery,
  DeviceSortField,
  DEVICE_STATUSES,
  FleetOverview,
  Paged,
  Site,
  SiteAqHistory,
  SortDir,
  TimeRange,
} from '../models';
import { buildDataset, Dataset } from './seed';
import { generateDeviceHistory, generateEnergySeries, generateSiteAqHistory } from './history';

/**
 * In-memory "database" backing the mock REST API. It owns the generated dataset
 * and exposes query/mutation methods that mirror what a real backend would do
 * (filter, sort, paginate, acknowledge). The HTTP interceptor is a thin adapter
 * over this class, which keeps the request-handling and the data logic separate
 * and makes the DB unit-testable on its own.
 */
export class MockDb {
  private readonly data: Dataset;

  constructor(seed?: number) {
    this.data = buildDataset(seed);
  }

  getSites(): Site[] {
    return this.data.sites;
  }

  getDevice(id: string): Device | undefined {
    return this.data.deviceSeeds.get(id)?.device;
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
