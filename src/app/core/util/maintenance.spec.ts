import { Telemetry } from '../models';
import {
  computeHealth,
  computeHealthScore,
  detectAnomalies,
  estimateRemainingUsefulLifeDays,
  TelemetryTrend,
} from './maintenance';

const STEADY: TelemetryTrend = { vibrationTrendMm: 0, temperatureTrendC: 0 };

function telemetry(overrides: Partial<Telemetry> = {}): Telemetry {
  return {
    rpm: 1500,
    powerW: 900,
    temperatureC: 45,
    vibrationMm: 1.5,
    airflowM3h: 1200,
    runtimeHours: 5000,
    ...overrides,
  };
}

describe('maintenance heuristic', () => {
  describe('computeHealthScore', () => {
    it('rates a healthy, lightly-used device near 100', () => {
      expect(computeHealthScore(telemetry(), STEADY)).toBeGreaterThanOrEqual(90);
    });

    it('drops sharply when vibration is critical', () => {
      const score = computeHealthScore(telemetry({ vibrationMm: 8 }), STEADY);
      expect(score).toBeLessThan(55);
    });

    it('drops when the motor overheats', () => {
      const score = computeHealthScore(telemetry({ temperatureC: 90 }), STEADY);
      expect(score).toBeLessThan(60);
    });

    it('penalises adverse trends on top of absolute values', () => {
      const stable = computeHealthScore(telemetry({ vibrationMm: 4 }), STEADY);
      const worsening = computeHealthScore(telemetry({ vibrationMm: 4 }), {
        vibrationTrendMm: 2,
        temperatureTrendC: 3,
      });
      expect(worsening).toBeLessThan(stable);
    });

    it('stays within [0, 100]', () => {
      const trashed = computeHealthScore(
        telemetry({ temperatureC: 120, vibrationMm: 20, runtimeHours: 90_000 }),
        { vibrationTrendMm: 10, temperatureTrendC: 10 },
      );
      expect(trashed).toBeGreaterThanOrEqual(0);
      expect(trashed).toBeLessThanOrEqual(100);
    });
  });

  describe('estimateRemainingUsefulLifeDays', () => {
    it('shrinks as health declines', () => {
      expect(estimateRemainingUsefulLifeDays(90, 5000)).toBeGreaterThan(
        estimateRemainingUsefulLifeDays(40, 5000),
      );
    });

    it('shrinks as runtime accumulates', () => {
      expect(estimateRemainingUsefulLifeDays(80, 5000)).toBeGreaterThan(
        estimateRemainingUsefulLifeDays(80, 50_000),
      );
    });
  });

  describe('computeHealth', () => {
    it('returns both a score and an RUL estimate', () => {
      const health = computeHealth(telemetry(), STEADY);
      expect(health.healthScore).toBeGreaterThan(0);
      expect(health.remainingUsefulLifeDays).toBeGreaterThan(0);
    });
  });

  describe('detectAnomalies', () => {
    it('finds no anomalies on a healthy device', () => {
      expect(detectAnomalies(telemetry(), STEADY)).toHaveLength(0);
    });

    it('raises a critical vibration alert past the limit', () => {
      const signals = detectAnomalies(telemetry({ vibrationMm: 8 }), STEADY);
      const vibration = signals.find((s) => s.type === 'rising_vibration');
      expect(vibration?.severity).toBe('critical');
    });

    it('raises a warning for an upward vibration trend before the limit', () => {
      const signals = detectAnomalies(telemetry({ vibrationMm: 3.5 }), {
        vibrationTrendMm: 1.5,
        temperatureTrendC: 0,
      });
      const vibration = signals.find((s) => s.type === 'rising_vibration');
      expect(vibration?.severity).toBe('warning');
    });

    it('flags overheating, low airflow and power anomalies', () => {
      expect(detectAnomalies(telemetry({ temperatureC: 90 }), STEADY).map((s) => s.type)).toContain(
        'overheating',
      );
      expect(
        detectAnomalies(telemetry({ rpm: 1600, airflowM3h: 400 }), STEADY).map((s) => s.type),
      ).toContain('low_airflow');
      expect(detectAnomalies(telemetry({ powerW: 2500 }), STEADY).map((s) => s.type)).toContain(
        'power_anomaly',
      );
    });
  });
});
