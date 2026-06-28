import { AirQualityReading } from './air-quality';

/** A building / facility that hosts a set of devices and air-quality sensors. */
export interface Site {
  id: string;
  name: string;
  /** Human-readable location, e.g. "Rotterdam, NL". */
  location: string;
  region: string;
  deviceCount: number;
  airQuality: AirQualityReading;
}
