import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { Alert } from '@core/models';
import { AlertItem } from './alert-item';

function makeAlert(overrides: Partial<Alert> = {}): Alert {
  return {
    id: 'alert-1',
    deviceId: 'dev-0001',
    deviceName: 'VortexPro V2 #0420',
    siteId: 'site-1',
    siteName: 'Helix Tower',
    severity: 'critical',
    type: 'rising_vibration',
    message: 'Vibration 7.4 mm/s exceeds the critical limit.',
    createdAt: new Date().toISOString(),
    acknowledged: false,
    acknowledgedAt: null,
    ...overrides,
  };
}

describe('AlertItem', () => {
  beforeEach(() =>
    TestBed.configureTestingModule({ imports: [AlertItem], providers: [provideRouter([])] }),
  );

  it('renders the alert type label and message', () => {
    const fixture = TestBed.createComponent(AlertItem);
    fixture.componentRef.setInput('alert', makeAlert());
    fixture.detectChanges();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Rising vibration');
    expect(text).toContain('exceeds the critical limit');
  });

  it('emits acknowledge with the alert id when the button is clicked', () => {
    const fixture = TestBed.createComponent(AlertItem);
    fixture.componentRef.setInput('alert', makeAlert({ id: 'alert-42' }));
    let emitted: string | undefined;
    fixture.componentInstance.acknowledge.subscribe((id) => (emitted = id));
    fixture.detectChanges();

    const button = (fixture.nativeElement as HTMLElement).querySelector('button')!;
    button.click();
    expect(emitted).toBe('alert-42');
  });

  it('shows an acknowledged state without an action button', () => {
    const fixture = TestBed.createComponent(AlertItem);
    fixture.componentRef.setInput(
      'alert',
      makeAlert({ acknowledged: true, acknowledgedAt: new Date().toISOString() }),
    );
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Acknowledged');
    expect(el.querySelector('button')).toBeNull();
  });
});
