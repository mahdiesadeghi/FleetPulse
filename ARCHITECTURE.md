# Architecture

This document explains the **state management** and **component boundaries** in
FleetPulse. For setup, the tech-stack rationale and "what's next", see
[`README.md`](./README.md).

## Layers

```
features/  ──uses──▶  shared/  ──uses──▶  core/
   │                                        ▲
   └────────────────uses────────────────────┘
```

- **`core/`** — no UI. Domain models, the deterministic data layer
  (`data/`), pure heuristics and the seeded RNG (`util/`), the mock-API
  interceptor, and injectable services (typed `HttpClient` wrappers, `ThemeStore`,
  `TelemetryStream`). Imports flow one way: nothing in `core` depends on
  `shared` or `features`.
- **`shared/`** — the design system: small, reusable, presentational components
  (`chart`, `kpi-card`, `status-chip`, `health-gauge`, `range-selector`,
  `alert-item`, `skeleton`, `empty-state`, `page-header`) and pipes. They take
  `input()`s, emit `output()`s, and hold no feature state.
- **`features/`** — one folder per route. Each contains a **container** page, a
  **feature-scoped signal store**, and **presentational children**.

Path aliases (`@core`, `@shared`, `@features`) enforce these boundaries and keep
imports readable. Within a single library, relative imports are used.

## State management

The app uses **Angular Signals** as the primary state primitive, with **RxJS**
for async orchestration. There is intentionally **no global store** — state is
co-located with the feature that owns it.

### Feature signal stores

Each feature provides a store at its **route component** (`providers: [XStore]`),
so the store's lifetime matches the page and nothing leaks globally.

A store typically exposes:

- **read-only signals** for the view: `data` / `loading` / `error` (via
  `signal(...).asReadonly()`),
- **writable signals** for UI/filter state (`search`, `siteId`, `status`,
  `range`, …),
- **`computed`** derivations (e.g. `hasActiveFilters`, `telemetryNow`).

### Reactive fetch pipeline

Filter/selection signals are projected into a query and turned into a request
stream, so the data re-fetches automatically and in-flight requests are
cancelled:

```ts
private readonly query = computed<DeviceQuery>(() => ({ /* from filter signals */ }));

toObservable(this.query).pipe(
  debounceTime(200),                 // smooth typing
  switchMap((q) => this.api.getDevices(q)),  // cancels the previous request
  takeUntilDestroyed(),
).subscribe((res) => this._devices.set(res.items));
```

The **device-detail store** is the richest example: two pipelines run off the
`deviceId` and `range` signals — one loads the device and (re)starts the live
telemetry stream via an outer `switchMap` (so changing device tears the old
stream down automatically), the other reloads history when id *or* range change.

### Why not NgRx?

NgRx shines with large, shared, cross-cutting state and complex effect graphs.
Here the state is overwhelmingly **server cache + local UI state**, scoped per
feature. Signals + a few RxJS operators express that with far less indirection,
while keeping the code easy to read in review. If the app grew a large amount of
genuinely shared client state, a signal-based root store (or NgRx SignalStore)
would be the next step — the per-feature stores already model that shape.

## Component boundaries

| Kind | Responsibility | Examples |
| --- | --- | --- |
| **Container (smart)** | Inject the store, trigger loads, wire events. Minimal template logic. | `OverviewPage`, `DevicesPage`, `DeviceDetailPage`, `AirQualityPage`, `AlertsPage` |
| **Presentational (dumb)** | Render `input()`s, emit `output()`s. No data access, no router (except link rendering). Reusable. | `DevicesTable`, `TelemetryCharts`, `HealthPanel`, `AqSiteCard`, `KpiCard`, `StatusChip`, `HealthGauge`, `ChartComponent`, `AlertItem` |

Conventions enforced across the board: `ChangeDetectionStrategy.OnPush`, signal
`input()`/`output()` APIs, `track` on every list, `takeUntilDestroyed()` for the
few manual subscriptions, and strict typing (no `any`).

## The mock backend

`core/interceptors/mock-api.interceptor.ts` matches `/api/*`, parses the
path/params, and delegates to `core/data/mock-db.ts` — an in-memory "database"
that filters, sorts, paginates and mutates (acknowledge). `MockDb` is built once
from `core/data/seed.ts` (a deterministic, seeded generator) and serves
time-series from `core/data/history.ts` on demand. Because services use a real
`HttpClient`, the interceptor is the *only* thing to remove when a real API
arrives.

```
HttpClient → mockApiInterceptor → MockDb → { seed.ts, history.ts } + util/{air-quality,maintenance}
```
