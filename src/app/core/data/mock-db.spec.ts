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
});
