import { MockDb } from './mock-db';

describe('MockDb', () => {
  // Fixed seed → deterministic fleet for stable assertions.
  let db: MockDb;
  beforeEach(() => {
    db = new MockDb(12345);
  });

  it('generates at least 4 sites and 500 devices', () => {
    expect(db.getSites().length).toBeGreaterThanOrEqual(4);
    expect(db.queryDevices({ pageSize: 1 }).total).toBeGreaterThanOrEqual(500);
  });

  it('filters devices by status', () => {
    const res = db.queryDevices({ status: 'online', pageSize: 1000 });
    expect(res.items.length).toBeGreaterThan(0);
    expect(res.items.every((d) => d.status === 'online')).toBe(true);
  });

  it('filters devices by free-text search across name, model and site', () => {
    const site = db.getSites()[0];
    const res = db.queryDevices({ search: site.name, pageSize: 1000 });
    expect(res.items.every((d) => d.siteName === site.name)).toBe(true);
  });

  it('paginates results', () => {
    const page0 = db.queryDevices({ page: 0, pageSize: 10 });
    const page1 = db.queryDevices({ page: 1, pageSize: 10 });
    expect(page0.items).toHaveLength(10);
    expect(page0.items[0].id).not.toBe(page1.items[0].id);
  });

  it('sorts by health score ascending', () => {
    const res = db.queryDevices({ sort: 'healthScore', dir: 'asc', pageSize: 1000 });
    for (let i = 1; i < res.items.length; i++) {
      expect(res.items[i].health.healthScore).toBeGreaterThanOrEqual(
        res.items[i - 1].health.healthScore,
      );
    }
  });

  it('acknowledges an open alert and removes it from the open list', () => {
    const open = db.queryAlerts({ acknowledged: false })[0];
    const updated = db.acknowledgeAlert(open.id);
    expect(updated?.acknowledged).toBe(true);
    expect(updated?.acknowledgedAt).not.toBeNull();
    expect(db.queryAlerts({ acknowledged: false }).some((a) => a.id === open.id)).toBe(false);
  });

  it('returns 404-style undefined for unknown ids', () => {
    expect(db.getDevice('does-not-exist')).toBeUndefined();
    expect(db.getDeviceHistory('nope', '24h')).toBeUndefined();
  });

  it('builds an internally consistent overview', () => {
    const overview = db.getOverview();
    const total = db.queryDevices({ pageSize: 1 }).total;
    expect(overview.kpis.totalDevices).toBe(total);
    expect(overview.kpis.onlinePct).toBeGreaterThanOrEqual(0);
    expect(overview.kpis.onlinePct).toBeLessThanOrEqual(100);
    expect(overview.statusBreakdown.reduce((sum, s) => sum + s.count, 0)).toBe(total);
    expect(overview.energySeries.length).toBeGreaterThan(0);
    expect(overview.topIssues.length).toBeGreaterThan(0);
  });

  it('produces device history that ends at the current time', () => {
    const id = db.queryDevices({ pageSize: 1 }).items[0].id;
    const history = db.getDeviceHistory(id, '24h');
    expect(history?.series.temperatureC.length).toBeGreaterThan(10);
    const last = history!.series.temperatureC.at(-1)!;
    expect(Date.now() - last.t).toBeLessThan(60_000);
  });

  describe('device CRUD', () => {
    const healthyTelemetry = {
      rpm: 1000,
      powerW: 600,
      temperatureC: 40,
      vibrationMm: 1,
      airflowM3h: 1100,
      runtimeHours: 1000,
    };
    const badTelemetry = { ...healthyTelemetry, temperatureC: 95, vibrationMm: 9 };

    it('creates a device, updating totals, site count, health and alerts', () => {
      const site = db.getSites()[0];
      const totalBefore = db.queryDevices({ pageSize: 1 }).total;
      const siteCountBefore = site.deviceCount;

      const created = db.createDevice({
        name: 'Test Fan',
        model: 'VortexPro V2',
        siteId: site.id,
        status: 'critical',
        telemetry: badTelemetry,
      });

      expect(created).toBeDefined();
      expect(db.queryDevices({ pageSize: 1 }).total).toBe(totalBefore + 1);
      expect(site.deviceCount).toBe(siteCountBefore + 1);
      // Health is derived from the supplied telemetry, not taken on trust.
      expect(created!.health.healthScore).toBeLessThan(60);
      // Anomalous telemetry raises alerts that now appear in the feed.
      expect(db.queryAlerts({ deviceId: created!.id }).length).toBeGreaterThan(0);
    });

    it('reflects new devices in the overview totals', () => {
      const overviewBefore = db.getOverview().kpis.totalDevices;
      db.createDevice({
        name: 'Overview Fan',
        model: 'AeroCore AX-900',
        siteId: db.getSites()[0].id,
        status: 'online',
        telemetry: healthyTelemetry,
      });
      expect(db.getOverview().kpis.totalDevices).toBe(overviewBefore + 1);
    });

    it('updates a device and recomputes derived health', () => {
      const site = db.getSites()[0];
      const created = db.createDevice({
        name: 'Edit Me',
        model: 'AeroCore AX-900',
        siteId: site.id,
        status: 'online',
        telemetry: healthyTelemetry,
      })!;
      const healthBefore = created.health.healthScore;

      const updated = db.updateDevice(created.id, {
        name: 'Edited',
        model: 'AeroCore AX-900',
        siteId: site.id,
        status: 'online',
        telemetry: badTelemetry,
      })!;

      expect(updated.name).toBe('Edited');
      expect(updated.health.healthScore).toBeLessThan(healthBefore);
    });

    it('moves a device between sites, adjusting both counts', () => {
      const [from, to] = db.getSites();
      const created = db.createDevice({
        name: 'Mover',
        model: 'VortexPro V2',
        siteId: from.id,
        status: 'online',
        telemetry: healthyTelemetry,
      })!;
      const fromCount = from.deviceCount;
      const toCount = to.deviceCount;

      db.updateDevice(created.id, {
        name: 'Mover',
        model: 'VortexPro V2',
        siteId: to.id,
        status: 'online',
        telemetry: healthyTelemetry,
      });

      expect(from.deviceCount).toBe(fromCount - 1);
      expect(to.deviceCount).toBe(toCount + 1);
      expect(db.getDevice(created.id)!.siteName).toBe(to.name);
    });

    it('deletes a device and removes its alerts', () => {
      const site = db.getSites()[0];
      const created = db.createDevice({
        name: 'Delete Me',
        model: 'VortexPro V2',
        siteId: site.id,
        status: 'offline',
        telemetry: healthyTelemetry,
      })!;
      expect(db.queryAlerts({ deviceId: created.id }).length).toBeGreaterThan(0); // offline alert

      const totalBefore = db.queryDevices({ pageSize: 1 }).total;
      const siteCountBefore = site.deviceCount;

      expect(db.deleteDevice(created.id)).toBe(true);
      expect(db.getDevice(created.id)).toBeUndefined();
      expect(db.queryDevices({ pageSize: 1 }).total).toBe(totalBefore - 1);
      expect(site.deviceCount).toBe(siteCountBefore - 1);
      expect(db.queryAlerts({ deviceId: created.id })).toHaveLength(0);
    });

    it('returns undefined / false for unknown ids', () => {
      const input = {
        name: 'x',
        model: 'VortexPro V2',
        siteId: db.getSites()[0].id,
        status: 'online' as const,
        telemetry: healthyTelemetry,
      };
      expect(db.updateDevice('dev-nope', input)).toBeUndefined();
      expect(db.deleteDevice('dev-nope')).toBe(false);
    });
  });
});
