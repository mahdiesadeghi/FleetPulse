import { AqRating } from '../models';
import { clamp, round } from './random';

/**
 * Air-quality scoring.
 *
 * A transparent, weighted model that converts raw sensor values into a single
 * 0–100 index. Each pollutant maps to a 0–100 sub-score via published comfort
 * thresholds, then the sub-scores are combined. This stands in for what would,
 * in production, be a calibrated/learned index — the rules are deliberately
 * explicit so the score is explainable.
 */

export interface AirQualityInput {
  co2Ppm: number;
  tvocPpb: number;
  humidityPct: number;
}

/** Outdoor-ish baseline; comfortable indoor CO₂. Penalty grows past it. */
const CO2_IDEAL_PPM = 600;
const CO2_WORST_PPM = 1800;

/** ppb. Below the ideal is "clean"; above the worst scores zero. */
const TVOC_IDEAL_PPB = 220;
const TVOC_WORST_PPB = 2200;

/** Comfort band for relative humidity; either side is penalised symmetrically. */
const HUMIDITY_LOW = 40;
const HUMIDITY_HIGH = 60;
const HUMIDITY_FALLOFF = 30;

/** Relative weights — CO₂ dominates perceived indoor air quality. */
const WEIGHTS = { co2: 0.5, tvoc: 0.3, humidity: 0.2 } as const;

function linearSubScore(value: number, ideal: number, worst: number): number {
  if (value <= ideal) {
    return 100;
  }
  return clamp(100 - ((value - ideal) / (worst - ideal)) * 100, 0, 100);
}

function humiditySubScore(humidityPct: number): number {
  if (humidityPct >= HUMIDITY_LOW && humidityPct <= HUMIDITY_HIGH) {
    return 100;
  }
  const distance =
    humidityPct < HUMIDITY_LOW ? HUMIDITY_LOW - humidityPct : humidityPct - HUMIDITY_HIGH;
  return clamp(100 - (distance / HUMIDITY_FALLOFF) * 100, 0, 100);
}

/** Combined 0–100 air-quality score (higher is better). */
export function computeAirQualityScore(input: AirQualityInput): number {
  const co2 = linearSubScore(input.co2Ppm, CO2_IDEAL_PPM, CO2_WORST_PPM);
  const tvoc = linearSubScore(input.tvocPpb, TVOC_IDEAL_PPB, TVOC_WORST_PPB);
  const humidity = humiditySubScore(input.humidityPct);
  const score = co2 * WEIGHTS.co2 + tvoc * WEIGHTS.tvoc + humidity * WEIGHTS.humidity;
  return round(clamp(score, 0, 100));
}

/** Map a 0–100 score onto a qualitative rating band. */
export function airQualityRating(score: number): AqRating {
  if (score >= 80) {
    return 'excellent';
  }
  if (score >= 60) {
    return 'good';
  }
  if (score >= 40) {
    return 'moderate';
  }
  return 'poor';
}
