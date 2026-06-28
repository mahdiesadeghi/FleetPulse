# FleetPulse

A polished, single-page monitoring dashboard for a fleet of connected industrial
fans/motors spread across several sites. It visualises live telemetry, indoor
air quality, and predictive-maintenance health, with drill-down into individual
devices.

> **Standalone demo with mock data.** There is no real backend — a seeded data
> generator and an Angular `HttpInterceptor` stand in for a REST API, so the
> whole thing runs with a single command. It is an original, domain-inspired
> portfolio piece (no real company names, logos, or data).

---

## Screenshots

> _Add screenshots / GIF here, e.g._
>
> | Overview | Device detail | Alerts |
> | --- | --- | --- |
> | `docs/overview.png` | `docs/device-detail.png` | `docs/alerts.png` |

The overview shows fleet KPIs, a status donut and a 24h energy chart; the device
detail page streams live telemetry tiles and time-series charts plus a health
gauge; the alerts feed supports filtering and one-click acknowledge. A light/dark
theme toggle and a fully responsive layout (≈360px → wide desktop) are built in.

---

## Quick start

```bash
npm install
npm start            # dev server on http://localhost:4200
```

| Task | Command |
| --- | --- |
| Run the app (dev) | `npm start` |
| Production build | `npm run build` |
| Unit tests | `npm test` |
| Lint | `npm run lint` |
| End-to-end test | `npm run e2e` (first run: `npx playwright install chromium`) |

**Requirements:** Node `^20.19 || ^22.12 || >=24` and npm 8+. Built and tested on
Node 24 with Angular 21.

---

## Tech stack & rationale

| Area | Choice | Why |
| --- | --- | --- |
| Framework | **Angular 21**, standalone components, no NgModules | Latest stable; standalone + the new control-flow syntax keep boilerplate low. |
| Language | **TypeScript (strict)** | No `any`; the domain is fully typed end-to-end. |
| State | **Angular Signals** + small per-feature signal stores | The app's state is mostly server cache + UI state. Signals give fine-grained reactivity and computed derivations with almost no ceremony. **NgRx was deliberately not used** — there is no complex cross-feature shared state or effect orchestration that would justify its boilerplate. |
| Async | **RxJS** | Drives the simulated real-time telemetry stream and the reactive filter→fetch pipelines (`toObservable` + `switchMap`/`debounceTime`). |
| UI kit | **Angular Material (Material 3)** | Used for form fields, selects and buttons, themed with a custom green palette + CSS design tokens — **not** the stock Material look. |
| Charts | **ngx-echarts (Apache ECharts)** | Chosen over Chart.js for its first-class **gauge** series (the health gauge), strong time-series rendering, and easy theming. ECharts is **lazy-imported**, so it never bloats the initial bundle. Charts are wrapped in a reusable `<app-chart>` presentational component fed by theme-aware option builders. |
| Data access | **HttpClient** + a mock REST `HttpInterceptor` | Real `HttpClient` calls (`GET /api/devices`, `POST /api/alerts/:id/ack`, …) so the integration patterns are real; swapping in a live backend is a one-line change. |
| Unit tests | **Vitest** (Angular 21's built-in runner) + jsdom | Fast, headless, no browser needed. |
| E2E | **Playwright** | One smoke test of the key flow. |

---

## Architecture overview

Feature-based, with strict layering and path aliases (`@core`, `@shared`,
`@features`). All routes are **lazy-loaded** per feature, every component uses
`ChangeDetectionStrategy.OnPush`, lists use `track`, and subscriptions use
`takeUntilDestroyed`.

```
src/app/
├─ core/                      # no UI; framework-agnostic where possible
│  ├─ models/                 # domain types & string-union enums (the single source of truth)
│  ├─ data/                   # seed.ts (deterministic generator), history.ts, mock-db.ts
│  ├─ util/                   # random (seeded RNG), air-quality + maintenance heuristics, http
│  ├─ interceptors/           # mock-api.interceptor.ts — the entire "backend"
│  └─ services/               # typed HttpClient services + ThemeStore + TelemetryStream
├─ shared/
│  ├─ ui/                     # design system: chart, kpi-card, status-chip, health-gauge,
│  │                          #   range-selector, alert-item, skeleton, empty-state, page-header
│  └─ pipes/                  # time-ago
├─ features/                  # one folder per route: container page + signal store + dumb children
│  ├─ overview/  devices/  device-detail/  air-quality/  alerts/
├─ layout (app.ts/html/scss)  # the shell: sidebar + top bar + theme toggle
└─ styles/                    # design tokens, Material theme, base styles
```

### Data flow

```
Component (container)
   → feature signal store  (signals: data / loading / error + filter state)
      → typed API service  (HttpClient → /api/…)
         → mock-api.interceptor  (matches /api/*, simulates latency)
            → MockDb  (filter / sort / paginate / acknowledge)
               → seed.ts + history.ts (deterministic data)  +  heuristics (AQ score, health, anomalies)
```

- **Containers vs presentational components.** Each feature has a *container*
  page that owns a feature-scoped signal store; the visuals are *presentational*
  components that take signal `input()`s and emit `output()`s (e.g. the device
  table, KPI cards, chart wrappers, alert items).
- **Signal stores.** Each store exposes read-only `data`/`loading`/`error`
  signals and writable filter signals. Filter changes flow to the API via
  `toObservable(...) → debounceTime → switchMap`, which also cancels in-flight
  requests automatically.
- **Domain model.** Closed sets (status, severity, rating, …) are modelled as
  string-literal unions backed by `as const` tuples rather than TS `enum`s — they
  serialize to plain JSON and give a runtime list to build filter dropdowns from.

See [`ARCHITECTURE.md`](./ARCHITECTURE.md) for more on state management and
component boundaries.

---

## Key engineering decisions

- **Mock API as an interceptor.** Services issue ordinary `HttpClient` requests;
  `mockApiInterceptor` is the only stand-in for a server and adds a small random
  latency so loading/skeleton states are real. Replacing it with a live API means
  deleting one line in `app.config.ts`.
- **Deterministic, coherent seed data.** A seeded PRNG builds the same fleet on
  every load (≥ 6 sites, **540 devices**). Crucially the data is *coherent*: each
  device gets a latent "wear" factor from which telemetry is synthesised, and its
  **status, health score and alerts are all derived from that same telemetry**
  via the shared heuristics — so a "critical" device really does have the
  vibration/temperature to justify it. Histories are regenerated on demand from
  each device's baseline (keeping memory low) and end at the current time so
  detail charts line up with the live tiles.
- **Transparent "ML" stand-ins.** [`air-quality.ts`](./src/app/core/util/air-quality.ts)
  and [`maintenance.ts`](./src/app/core/util/maintenance.ts) are pure, documented
  functions with named thresholds (loosely based on ISO 10816 vibration bands).
  They are the most heavily unit-tested part of the app.
- **Performance tactics.** Lazy-loaded route chunks; lazy-imported ECharts (the
  initial `main` bundle is ~50 kB); **CDK virtual scrolling** for the 540-row
  device table; `OnPush` everywhere; server-side filtering/sorting in the mock
  API; `track` on all lists.
- **Theming.** A single Material 3 `mat.theme()` call emits system variables via
  CSS `light-dark()`; toggling `color-scheme` (driven by a `ThemeStore` signal)
  flips the whole palette — no second stylesheet. A semantic design-token layer
  (`--fp-*`) sits on top for spacing, radius, elevation and status colours.
- **Accessibility.** Skip link, keyboard-navigable nav, visible focus rings,
  ARIA roles/labels on charts and controls, WCAG-AA-minded contrast, and
  `prefers-reduced-motion` support.

---

## Testing

- **Unit (Vitest):** the air-quality scoring and the predictive-maintenance /
  anomaly heuristics; the `MockDb` data layer (filter/sort/paginate/ack); the
  `DeviceApi` and `ThemeStore` services; and the `App` shell, `StatusChip`,
  `KpiCard` and `AlertItem` components. Run with `npm test`.
- **E2E (Playwright):** one smoke test covering **load dashboard → open a device
  → acknowledge an alert** (`e2e/fleetpulse.spec.ts`). Run with `npm run e2e`
  (the Playwright config starts the dev server automatically; on a fresh machine
  run `npx playwright install chromium` once).

---

## Deploying a static build

```bash
npm run build      # outputs to dist/fleetpulse/browser
```

It's a static SPA, so any static host works (Netlify, Vercel, GitHub Pages). For
SPA routing, point all paths to `index.html` (e.g. a Netlify `_redirects` file
with `/* /index.html 200`).

---

## What I'd do next with a real backend

- Replace `mockApiInterceptor` with the real API base URL and add an auth
  interceptor (token refresh, 401 handling) — feature code is untouched.
- Swap the simulated `TelemetryStream` for a **WebSocket** (it already exposes an
  `Observable<Telemetry>`, so consumers don't change).
- Move pagination fully server-side for the device list and add cursor paging.
- Replace the heuristic health/anomaly functions with the real ML scoring
  service; the `MaintenanceHealth` / `Alert` contracts already model the output.
- Add caching/retry (e.g. a thin query layer), error telemetry, and i18n.
- Persist acknowledgements and user preferences server-side.
