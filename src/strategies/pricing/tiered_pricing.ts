import { CAR_TYPE_MULTIPLIERS, FareBreakdown, TierDetail, DiscountType } from '../../models/index.js';
import { PricingParams, PricingStrategy } from './pricing_strategy.js';

export interface TierConfig {
  name: string;
  minKm: number;
  maxKm: number; // Use Infinity for the last open-ended tier
  ratePerKm: number;
}

/**
 * TieredPricingStrategy
 *
 * Default tiers:
 *   0–2 km  @ ₹10/km
 *   2–5 km  @ ₹8/km
 *   5+ km   @ ₹5/km
 *
 * Applies: car-type multiplier → surge → minimum fare floor → coupon discount
 */
export class TieredPricingStrategy implements PricingStrategy {
  private minRidePrice: number;
  private tiers: TierConfig[];
  private carMultipliers: Record<string, number>;

  constructor(
    minRidePrice: number = 50,
    tiers?: TierConfig[],
    carMultipliers?: Record<string, number>
  ) {
    this.minRidePrice = minRidePrice;
    this.tiers = tiers || [
      { name: 'First 2 km', minKm: 0, maxKm: 2, ratePerKm: 10 },
      { name: '2–5 km', minKm: 2, maxKm: 5, ratePerKm: 8 },
      { name: '5 km and beyond', minKm: 5, maxKm: Infinity, ratePerKm: 5 },
    ];
    this.carMultipliers = carMultipliers || { ...CAR_TYPE_MULTIPLIERS };
  }

  public calculateFare(params: PricingParams): FareBreakdown {
    const { distanceKm, billedCarType, assignedCarType, isUpgraded, coupon, surgeMultiplier = 1.0 } = params;
    const dist = Math.max(0, distanceKm);

    // 1. Tiered calculation
    const tieredBreakdown: TierDetail[] = [];
    let rawTieredFare = 0;

    for (const tier of this.tiers) {
      if (dist > tier.minKm) {
        const km = Math.round((Math.min(dist, tier.maxKm) - tier.minKm) * 100) / 100;
        const subtotal = Math.round(km * tier.ratePerKm * 100) / 100;
        rawTieredFare += subtotal;
        tieredBreakdown.push({ tierName: tier.name, distanceKm: km, ratePerKm: tier.ratePerKm, subtotal });
      }
    }
    rawTieredFare = Math.round(rawTieredFare * 100) / 100;

    // 2. Car-type multiplier (billedCarType used — so free upgrades stay at lower rate)
    const carMult = this.carMultipliers[billedCarType] ?? 1.0;
    const fareAfterCarMultiplier = Math.round(rawTieredFare * carMult * 100) / 100;

    // 3. Surge
    const surge = Math.max(1.0, surgeMultiplier);
    const fareAfterSurge = Math.round(fareAfterCarMultiplier * surge * 100) / 100;

    // 4. Minimum fare floor
    const fareBeforeDiscount = Math.max(this.minRidePrice, fareAfterSurge);

    // 5. Coupon discount
    let discountAmount = 0;
    if (coupon && coupon.isActive) {
      const meetsMin = !coupon.minRideFare || fareBeforeDiscount >= coupon.minRideFare;
      if (meetsMin) {
        if (coupon.discountType === DiscountType.PERCENTAGE) {
          const raw = (fareBeforeDiscount * coupon.discountValue) / 100;
          discountAmount = coupon.maxDiscount ? Math.min(raw, coupon.maxDiscount) : raw;
        } else if (coupon.discountType === DiscountType.FLAT) {
          discountAmount = coupon.discountValue;
        }
        discountAmount = Math.round(discountAmount * 100) / 100;
      }
    }

    const finalFare = Math.max(0, Math.round((fareBeforeDiscount - discountAmount) * 100) / 100);

    return {
      distanceKm: dist,
      tieredBreakdown,
      rawTieredFare,
      carTypeMultiplier: carMult,
      fareAfterCarMultiplier,
      surgeMultiplier: surge,
      fareAfterSurge,
      minimumFare: this.minRidePrice,
      fareBeforeDiscount,
      discountAmount,
      finalFare,
      couponCode: coupon?.code,
      isUpgraded,
      requestedCarType: billedCarType,
      billedCarType,
      assignedCarType,
    };
  }

  /** Extensibility: add a new tier at runtime (e.g. for live demo extension). */
  public addTier(tier: TierConfig): void {
    this.tiers.push(tier);
  }

  /** Extensibility: add or update a car-type multiplier (e.g. SUV = 1.5). */
  public setCarMultiplier(carType: string, multiplier: number): void {
    this.carMultipliers[carType] = multiplier;
  }
}
