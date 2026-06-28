import { TestBed } from '@angular/core/testing';

import { KpiCard } from './kpi-card';

describe('KpiCard', () => {
  beforeEach(() => TestBed.configureTestingModule({ imports: [KpiCard] }));

  it('renders the label, value and unit', () => {
    const fixture = TestBed.createComponent(KpiCard);
    fixture.componentRef.setInput('label', 'Online');
    fixture.componentRef.setInput('value', 97);
    fixture.componentRef.setInput('unit', '%');
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.kpi__label')?.textContent).toContain('Online');
    expect(el.querySelector('.kpi__value')?.textContent).toContain('97');
    expect(el.querySelector('.kpi__unit')?.textContent).toContain('%');
  });

  it('omits the hint when none is provided', () => {
    const fixture = TestBed.createComponent(KpiCard);
    fixture.componentRef.setInput('label', 'Devices');
    fixture.componentRef.setInput('value', 540);
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).querySelector('.kpi__hint')).toBeNull();
  });
});
