import { airQualityRating, computeAirQualityScore } from './air-quality';

describe('air-quality scoring', () => {
  it('scores pristine air at 100 / excellent', () => {
    const score = computeAirQualityScore({ co2Ppm: 480, tvocPpb: 120, humidityPct: 50 });
    expect(score).toBe(100);
    expect(airQualityRating(score)).toBe('excellent');
  });

  it('drives the score down as CO2 rises (monotonic)', () => {
    const base = { tvocPpb: 120, humidityPct: 50 };
    const clean = computeAirQualityScore({ ...base, co2Ppm: 500 });
    const stuffy = computeAirQualityScore({ ...base, co2Ppm: 1200 });
    const bad = computeAirQualityScore({ ...base, co2Ppm: 1800 });
    expect(clean).toBeGreaterThan(stuffy);
    expect(stuffy).toBeGreaterThan(bad);
  });

  it('penalises humidity outside the comfort band symmetrically', () => {
    const base = { co2Ppm: 500, tvocPpb: 120 };
    const comfortable = computeAirQualityScore({ ...base, humidityPct: 50 });
    const tooDry = computeAirQualityScore({ ...base, humidityPct: 20 });
    const tooHumid = computeAirQualityScore({ ...base, humidityPct: 80 });
    expect(comfortable).toBeGreaterThan(tooDry);
    expect(tooDry).toBe(tooHumid);
  });

  it('clamps a thoroughly polluted reading to 0 / poor', () => {
    const score = computeAirQualityScore({ co2Ppm: 2500, tvocPpb: 3000, humidityPct: 95 });
    expect(score).toBe(0);
    expect(airQualityRating(score)).toBe('poor');
  });

  it('maps scores onto the correct rating bands', () => {
    expect(airQualityRating(85)).toBe('excellent');
    expect(airQualityRating(80)).toBe('excellent');
    expect(airQualityRating(79)).toBe('good');
    expect(airQualityRating(60)).toBe('good');
    expect(airQualityRating(40)).toBe('moderate');
    expect(airQualityRating(39)).toBe('poor');
  });
});
