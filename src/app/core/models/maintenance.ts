/** Predictive-maintenance health for a single device. */
export interface MaintenanceHealth {
  /** 0–100, higher is healthier. Derived by the maintenance heuristic. */
  healthScore: number;
  /** Estimated remaining useful life, in days. */
  remainingUsefulLifeDays: number;
}
