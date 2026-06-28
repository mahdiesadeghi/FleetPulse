import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import {
  provideRouter,
  withComponentInputBinding,
  withInMemoryScrolling,
} from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideEchartsCore } from 'ngx-echarts';

import { routes } from './app.routes';
import { mockApiInterceptor } from '@core/interceptors/mock-api.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(
      routes,
      withComponentInputBinding(),
      withInMemoryScrolling({ scrollPositionRestoration: 'enabled', anchorScrolling: 'enabled' }),
    ),
    // Real HttpClient; the mock REST API is served entirely by an interceptor (see §6),
    // so swapping in a real backend is a one-line change here.
    provideHttpClient(withInterceptors([mockApiInterceptor])),
    provideAnimationsAsync(),
    // ECharts is lazily imported so it never bloats the initial bundle.
    provideEchartsCore({ echarts: () => import('echarts') }),
  ],
};
