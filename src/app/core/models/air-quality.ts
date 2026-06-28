/** Air-quality rating bands, best → worst. */
export const AQ_RATINGS = ['excellent', 'good', 'moderate', 'poor'] as const;
export type AqRating = (typeof AQ_RATINGS)[number];

/** Latest indoor air-quality reading for a site, plus the derived score. */
export interface AirQualityReading {
  co2Ppm: number;
  tvocPpb: number;
  humidityPct: number;
  temperatureC: number;
  /** 0–100, higher is better. Derived by the air-quality scoring function. */
  score: number;
  rating: AqRating;
}

/** Air-quality channels that can be charted over time. */
export const AQ_METRICS = ['co2Ppm', 'tvocPpb', 'humidityPct', 'score'] as const;
export type AqMetric = (typeof AQ_METRICS)[number];
