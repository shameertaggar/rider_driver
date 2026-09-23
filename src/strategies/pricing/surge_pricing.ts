/**
 * Pluggable surge pricing calculator based on demand-to-supply ratio.
 */
export interface SurgeCalculator {
  getSurgeMultiplier(activeDemand: number, availableSupply: number): number;
}

export class DemandSupplySurgeCalculator implements SurgeCalculator {
  private maxSurge: number;

  constructor(maxSurge: number = 3.0) {
    this.maxSurge = maxSurge;
  }

  public getSurgeMultiplier(activeDemand: number, availableSupply: number): number {
    if (availableSupply <= 0) return this.maxSurge;
    const ratio = activeDemand / availableSupply;
    if (ratio <= 1.0) return 1.0; // No surge
    // Gradual surge: ratio 2.0 → 1.5x, ratio 3.0 → 2.0x, capped at maxSurge
    const surge = 1.0 + (ratio - 1.0) * 0.5;
    return Math.min(this.maxSurge, Math.round(surge * 10) / 10);
  }
}
