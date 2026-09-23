import { CarType, FareBreakdown, Coupon } from '../../models/modelsIndex.js';

export interface PricingParams {
  distanceKm: number;
  billedCarType: CarType;
  assignedCarType: CarType;
  isUpgraded: boolean;
  coupon?: Coupon | null;
  surgeMultiplier?: number;
}

export interface PricingStrategy {
  calculateFare(params: PricingParams): FareBreakdown;
}
