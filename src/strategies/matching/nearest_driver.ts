import { Driver, Cab, CarType, Location } from '../../models/index.js';
import { DriverMatchingStrategy, MatchCandidate, MatchResult } from './matching_strategy.js';
import { DistanceStrategy, EuclideanDistanceStrategy } from '../distance/index.js';

/**
 * Selects the nearest available driver within radius.
 * Includes Hatchback → Sedan free upgrade fallback.
 */
export class NearestDriverMatchingStrategy implements DriverMatchingStrategy {
  public readonly strategyName = 'NEAREST_DRIVER';

  constructor(private distanceStrategy: DistanceStrategy = new EuclideanDistanceStrategy()) {}

  public setDistanceStrategy(strategy: DistanceStrategy): void {
    this.distanceStrategy = strategy;
  }

  public getDistanceStrategy(): DistanceStrategy {
    return this.distanceStrategy;
  }

  public findMatch(
    availableDrivers: Array<{ driver: Driver; cab: Cab }>,
    pickupLocation: Location,
    maxRadiusKm: number,
    requestedCarType: CarType
  ): MatchResult | null {
    // Calculate distances and filter within radius
    const withinRadius: MatchCandidate[] = [];
    for (const item of availableDrivers) {
      const dist = this.distanceStrategy.calculate(item.cab.currentLocation, pickupLocation);
      if (dist <= maxRadiusKm) {
        withinRadius.push({ driver: item.driver, cab: item.cab, distanceKm: dist });
      }
    }

    if (withinRadius.length === 0) return null;

    // 1. Try exact car-type match, sorted by distance
    const exact = withinRadius
      .filter(c => c.cab.carType === requestedCarType)
      .sort((a, b) => a.distanceKm - b.distanceKm);

    if (exact.length > 0) {
      const best = exact[0];
      return {
        driver: best.driver, cab: best.cab, distanceKm: best.distanceKm,
        isUpgraded: false, requestedCarType, billedCarType: requestedCarType, assignedCarType: requestedCarType,
      };
    }

    // 2. Hatchback requested but none available → free upgrade to Sedan at Hatchback rate
    if (requestedCarType === CarType.HATCHBACK) {
      const sedans = withinRadius
        .filter(c => c.cab.carType === CarType.SEDAN)
        .sort((a, b) => a.distanceKm - b.distanceKm);

      if (sedans.length > 0) {
        const best = sedans[0];
        return {
          driver: best.driver, cab: best.cab, distanceKm: best.distanceKm,
          isUpgraded: true,
          requestedCarType: CarType.HATCHBACK,
          billedCarType: CarType.HATCHBACK, // billed at Hatchback rate!
          assignedCarType: CarType.SEDAN,
        };
      }
    }

    return null;
  }
}
