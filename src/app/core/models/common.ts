/**
 * Shared primitive types.
 *
 * We model closed sets (status, severity, rating…) as string-literal unions
 * derived from `as const` tuples rather than TS `enum`s. Unions serialize to
 * plain JSON for free, tree-shake cleanly, and the backing tuple gives us a
 * runtime list to iterate (e.g. to build filter dropdowns).
 */

/** A single point in a time-series. `t` is epoch milliseconds, `v` the value. */
export interface TimeSeriesPoint {
  t: number;
  v: number;
}

export type SortDir = 'asc' | 'desc';
