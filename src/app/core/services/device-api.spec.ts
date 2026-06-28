import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { DeviceApi } from './device-api';

describe('DeviceApi', () => {
  let api: DeviceApi;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [DeviceApi, provideHttpClient(), provideHttpClientTesting()],
    });
    api = TestBed.inject(DeviceApi);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('GETs /api/devices with only the provided query params', () => {
    api.getDevices({ search: 'fan', status: 'online', page: 0, pageSize: 25 }).subscribe();

    const req = httpMock.expectOne((r) => r.url === '/api/devices');
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('search')).toBe('fan');
    expect(req.request.params.get('status')).toBe('online');
    expect(req.request.params.get('pageSize')).toBe('25');
    // Undefined fields must be omitted, not sent as "undefined".
    expect(req.request.params.has('siteId')).toBe(false);
    req.flush({ items: [], total: 0, page: 0, pageSize: 25 });
  });

  it('GETs a single device by id', () => {
    api.getDevice('dev-0001').subscribe();
    const req = httpMock.expectOne('/api/devices/dev-0001');
    expect(req.request.method).toBe('GET');
    req.flush({});
  });

  it('GETs device history with the range param', () => {
    api.getHistory('dev-0001', '7d').subscribe();
    const req = httpMock.expectOne((r) => r.url === '/api/devices/dev-0001/history');
    expect(req.request.params.get('range')).toBe('7d');
    req.flush({});
  });
});
