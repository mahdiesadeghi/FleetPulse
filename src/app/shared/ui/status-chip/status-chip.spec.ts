import { TestBed } from '@angular/core/testing';

import { StatusChip } from './status-chip';

describe('StatusChip', () => {
  beforeEach(() => TestBed.configureTestingModule({ imports: [StatusChip] }));

  it('renders the human-readable label for a status', () => {
    const fixture = TestBed.createComponent(StatusChip);
    fixture.componentRef.setInput('status', 'critical');
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Critical');
  });

  it('exposes the status colour as a CSS custom property', () => {
    const fixture = TestBed.createComponent(StatusChip);
    fixture.componentRef.setInput('status', 'online');
    fixture.detectChanges();
    const chip = (fixture.nativeElement as HTMLElement).querySelector('.chip') as HTMLElement;
    expect(chip.style.getPropertyValue('--chip-color')).toContain('--fp-status-online');
  });
});
