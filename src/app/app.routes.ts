import { Routes } from '@angular/router';

const BRAND = 'FleetPulse';

/**
 * Every feature is a standalone component loaded lazily (`loadComponent`), so
 * each route is its own bundle chunk and the initial download stays small.
 */
export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'overview' },
  {
    path: 'overview',
    title: `Overview · ${BRAND}`,
    loadComponent: () => import('@features/overview/overview-page').then((m) => m.OverviewPage),
  },
  {
    path: 'devices',
    title: `Devices · ${BRAND}`,
    loadComponent: () => import('@features/devices/devices-page').then((m) => m.DevicesPage),
  },
  {
    path: 'devices/:id',
    title: `Device · ${BRAND}`,
    loadComponent: () =>
      import('@features/device-detail/device-detail-page').then((m) => m.DeviceDetailPage),
  },
  {
    path: 'air-quality',
    title: `Air Quality · ${BRAND}`,
    loadComponent: () =>
      import('@features/air-quality/air-quality-page').then((m) => m.AirQualityPage),
  },
  {
    path: 'alerts',
    title: `Alerts · ${BRAND}`,
    loadComponent: () => import('@features/alerts/alerts-page').then((m) => m.AlertsPage),
  },
  {
    path: '**',
    title: `Not found · ${BRAND}`,
    loadComponent: () => import('@shared/not-found/not-found').then((m) => m.NotFound),
  },
];
