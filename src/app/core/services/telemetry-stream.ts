import { Injectable } from '@angular/core';
import { Observable, of, scan, timer } from 'rxjs';

import { Device, Telemetry } from '../models';
import { clamp, round } from '../util/random';

/**
 * Simulated real-time telemetry feed.
 *
 * `connect()` returns a cold Observable that emits the device's current reading
 * immediately, then a new reading on every tick — a bounded, mean-reverting
 * random walk around the device's operating point, so values jitter realistically
 * without drifting away. This is intentionally the same shape a WebSocket feed
 * would have (`Observable<Telemetry>`), so replacing this with a real socket is a
 * drop-in change for every consumer.
 */
@Injectable({ providedIn: 'root' })
export class TelemetryStream {
  connect(device: Device, intervalMs = 2000): Observable<Telemetry> {
    // Offline fans aren't reporting — emit a single, static "stopped" reading.
    if (device.status === 'offline') {
      return of(device.telemetry);
    }

    const anchor = device.telemetry;
    return timer(0, intervalMs).pipe(
      scan((prev, tick) => (tick === 0 ? prev : this.next(prev, anchor, intervalMs)), anchor),
    );
  }

  private next(prev: Telemetry, anchor: Telemetry, intervalMs: number): Telemetry {
    return {
      rpm: round(this.walk(prev.rpm, anchor.rpm, anchor.rpm * 0.015, anchor.rpm * 0.85, anchor.rpm * 1.12)),
      powerW: round(this.walk(prev.powerW, anchor.powerW, anchor.powerW * 0.02, 0, anchor.powerW * 1.3)),
      temperatureC: round(
        this.walk(prev.temperatureC, anchor.temperatureC, 0.4, anchor.temperatureC - 6, anchor.temperatureC + 8),
        1,
      ),
      vibrationMm: round(
        this.walk(
          prev.vibrationMm,
          anchor.vibrationMm,
          0.08,
          Math.max(0.1, anchor.vibrationMm - 1),
          anchor.vibrationMm + 1.5,
        ),
        2,
      ),
      airflowM3h: round(
        this.walk(prev.airflowM3h, anchor.airflowM3h, anchor.airflowM3h * 0.02, 0, anchor.airflowM3h * 1.2),
      ),
      // Runtime simply accrues with wall-clock time.
      runtimeHours: round(prev.runtimeHours + intervalMs / 3_600_000, 2),
    };
  }

  /** One step of a mean-reverting random walk, clamped to a plausible band. */
  private walk(value: number, anchor: number, step: number, min: number, max: number): number {
    const reverted = value + (anchor - value) * 0.08;
    return clamp(reverted + this.gaussian(step), min, max);
  }

  private gaussian(stdDev: number): number {
    const u = 1 - Math.random();
    const v = Math.random();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v) * stdDev;
  }
}
