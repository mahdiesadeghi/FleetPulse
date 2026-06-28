import { Pipe, PipeTransform } from '@angular/core';

/** Formats an ISO timestamp as a compact relative time, e.g. "5m ago". */
@Pipe({ name: 'timeAgo' })
export class TimeAgoPipe implements PipeTransform {
  transform(value: string | number | null | undefined): string {
    if (value === null || value === undefined) {
      return '—';
    }
    const then = typeof value === 'number' ? value : Date.parse(value);
    if (Number.isNaN(then)) {
      return '—';
    }

    const seconds = Math.max(0, Math.round((Date.now() - then) / 1000));
    if (seconds < 45) {
      return 'just now';
    }
    const units: [limit: number, div: number, suffix: string][] = [
      [3600, 60, 'm'],
      [86_400, 3600, 'h'],
      [2_592_000, 86_400, 'd'],
      [31_536_000, 2_592_000, 'mo'],
      [Infinity, 31_536_000, 'y'],
    ];
    for (const [limit, div, suffix] of units) {
      if (seconds < limit) {
        return `${Math.floor(seconds / div)}${suffix} ago`;
      }
    }
    return '—';
  }
}
