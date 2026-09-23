import { Driver, Cab, CarType, Location } from '../../models/index.js';
import { DriverMatchingStrategy, MatchCandidate, MatchResult } from './matching_strategy.js';
import { DistanceStrategy, EuclideanDistanceStrategy } from '../distance/index.js';

/**
 * Selects the highest-rated available driver within radius.
 * Ties broken by distance (closer wins). Includes free upgrade fallback.
 */
export class HighestRatedDriverMatchingStrategy implements DriverMatchingStrategy {
  public readonly strategyName = 'HIGHEST_RATED_DRIVER';

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
    const withinRadius: MatchCandidate[] = [];
    for (const item of availableDrivers) {
      const dist = this.distanceStrategy.calculate(item.cab.currentLocation, pickupLocation);
      if (dist <= maxRadiusKm) {
        withinRadius.push({ driver: item.driver, cab: item.cab, distanceKm: dist });
      }
    }

    if (withinRadius.length === 0) return null;

    // Sort: highest rating first, then closest distance as tiebreaker
    const byRating = (a: MatchCandidate, b: MatchCandidate) =>
      b.driver.rating !== a.driver.rating
        ? b.driver.rating - a.driver.rating
        : a.distanceKm - b.distanceKm;

    // 1. Try exact car-type match
    const exact = withinRadius.filter(c => c.cab.carType === requestedCarType).sort(byRating);
    if (exact.length > 0) {
      const best = exact[0];
      return {
        driver: best.driver, cab: best.cab, distanceKm: best.distanceKm,
        isUpgraded: false, requestedCarType, billedCarType: requestedCarType, assignedCarType: requestedCarType,
      };
    }

    // 2. Hatchback → Sedan free upgrade
    if (requestedCarType === CarType.HATCHBACK) {
      const sedans = withinRadius.filter(c => c.cab.carType === CarType.SEDAN).sort(byRating);
      if (sedans.length > 0) {
        const best = sedans[0];
        return {
          driver: best.driver, cab: best.cab, distanceKm: best.distanceKm,
          isUpgraded: true,
          requestedCarType: CarType.HATCHBACK,
          billedCarType: CarType.HATCHBACK,
          assignedCarType: CarType.SEDAN,
        };
      }
    }

    return null;
  }
}
