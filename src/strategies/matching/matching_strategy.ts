import { Driver, Cab, CarType, Location } from '../../models/index.js';
import { DistanceStrategy } from '../distance/distance_strategy.js';

export interface MatchCandidate {
  driver: Driver;
  cab: Cab;
  distanceKm: number;
}

export interface MatchResult {
  driver: Driver;
  cab: Cab;
  distanceKm: number;
  isUpgraded: boolean;
  requestedCarType: CarType;
  billedCarType: CarType;
  assignedCarType: CarType;
}

export interface DriverMatchingStrategy {
  readonly strategyName: string;

  findMatch(
    availableDrivers: Array<{ driver: Driver; cab: Cab }>,
    pickupLocation: Location,
    maxRadiusKm: number,
    requestedCarType: CarType
  ): MatchResult | null;

  setDistanceStrategy?(strategy: DistanceStrategy): void;
  getDistanceStrategy?(): DistanceStrategy;
}
