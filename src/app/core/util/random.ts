/**
 * Deterministic pseudo-random generator.
 *
 * The whole mock dataset is built from a single seed so that every reload (and
 * every test run) produces the exact same fleet — essential for stable demos,
 * screenshots and assertions. `mulberry32` is a tiny, well-distributed 32-bit
 * PRNG; good enough for seed data and dependency-free.
 */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class Rng {
  private readonly next: () => number;

  constructor(seed: number) {
    this.next = mulberry32(seed);
  }

  /** Uniform float in [min, max). */
  float(min = 0, max = 1): number {
    return min + this.next() * (max - min);
  }

  /** Uniform integer in [min, max] (inclusive). */
  int(min: number, max: number): number {
    return Math.floor(this.float(min, max + 1));
  }

  /** True with probability `p`. */
  bool(p = 0.5): boolean {
    return this.next() < p;
  }

  /** Uniformly pick one element. */
  pick<T>(items: readonly T[]): T {
    return items[this.int(0, items.length - 1)];
  }

  /** Pick one element using relative weights. */
  weighted<T>(entries: readonly { value: T; weight: number }[]): T {
    const total = entries.reduce((sum, e) => sum + e.weight, 0);
    let roll = this.float(0, total);
    for (const entry of entries) {
      roll -= entry.weight;
      if (roll <= 0) {
        return entry.value;
      }
    }
    return entries[entries.length - 1].value;
  }

  /** Normally-distributed value (Box–Muller), used for realistic telemetry noise. */
  gaussian(mean = 0, stdDev = 1): number {
    const u = 1 - this.next();
    const v = this.next();
    const mag = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
    return mean + mag * stdDev;
  }
}

/** Clamp a number into [min, max]. */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Round to `decimals` decimal places (default 0). */
export function round(value: number, decimals = 0): number {
  const f = 10 ** decimals;
  return Math.round(value * f) / f;
}
