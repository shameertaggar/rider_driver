import { describe, it, expect } from 'vitest';
import { TieredPricingStrategy } from '../src/strategies/pricing/tiered_pricing.js';
import { DemandSupplySurgeCalculator } from '../src/strategies/pricing/surge_pricing.js';
import { CarType, DiscountType, Coupon } from '../src/models/index.js';

describe('TieredPricingStrategy', () => {
  const pricing = new TieredPricingStrategy(50);

  it('enforces minimum fare for short distances', () => {
    const fare = pricing.calculateFare({
      distanceKm: 1, billedCarType: CarType.HATCHBACK, assignedCarType: CarType.HATCHBACK, isUpgraded: false,
    });
    expect(fare.rawTieredFare).toBe(10);
    expect(fare.finalFare).toBe(50); // min fare kicks in
  });

  it('calculates tiered pricing correctly for 10 km', () => {
    // 2 km @ 10 = 20, 3 km @ 8 = 24, 5 km @ 5 = 25 → total = 69
    const fare = pricing.calculateFare({
      distanceKm: 10, billedCarType: CarType.HATCHBACK, assignedCarType: CarType.HATCHBACK, isUpgraded: false,
    });
    expect(fare.tieredBreakdown).toHaveLength(3);
    expect(fare.tieredBreakdown[0].subtotal).toBe(20);
    expect(fare.tieredBreakdown[1].subtotal).toBe(24);
    expect(fare.tieredBreakdown[2].subtotal).toBe(25);
    expect(fare.rawTieredFare).toBe(69);
    expect(fare.finalFare).toBe(69);
  });

  it('applies Sedan car-type multiplier (1.2x)', () => {
    const fare = pricing.calculateFare({
      distanceKm: 10, billedCarType: CarType.SEDAN, assignedCarType: CarType.SEDAN, isUpgraded: false,
    });
    expect(fare.carTypeMultiplier).toBe(1.2);
    expect(fare.fareAfterCarMultiplier).toBe(82.8);
    expect(fare.finalFare).toBe(82.8);
  });

  it('bills free upgrade (Sedan assigned) at Hatchback rate', () => {
    const fare = pricing.calculateFare({
      distanceKm: 10, billedCarType: CarType.HATCHBACK, assignedCarType: CarType.SEDAN, isUpgraded: true,
    });
    expect(fare.isUpgraded).toBe(true);
    expect(fare.carTypeMultiplier).toBe(1.0); // Hatchback rate!
    expect(fare.finalFare).toBe(69);          // NOT 82.8
  });

  it('applies percentage coupon with max discount cap', () => {
    const coupon: Coupon = {
      code: 'SAVE50', discountType: DiscountType.PERCENTAGE, discountValue: 50,
      maxDiscount: 20, usedCount: 0, isActive: true,
    };
    // 69 * 50% = 34.5, capped at 20 → 69 - 20 = 49
    const fare = pricing.calculateFare({
      distanceKm: 10, billedCarType: CarType.HATCHBACK, assignedCarType: CarType.HATCHBACK, isUpgraded: false, coupon,
    });
    expect(fare.discountAmount).toBe(20);
    expect(fare.finalFare).toBe(49);
  });

  it('applies flat coupon discount', () => {
    const coupon: Coupon = {
      code: 'FLAT15', discountType: DiscountType.FLAT, discountValue: 15,
      usedCount: 0, isActive: true,
    };
    const fare = pricing.calculateFare({
      distanceKm: 10, billedCarType: CarType.HATCHBACK, assignedCarType: CarType.HATCHBACK, isUpgraded: false, coupon,
    });
    expect(fare.discountAmount).toBe(15);
    expect(fare.finalFare).toBe(54);
  });

  it('rejects coupon when fare is below minRideFare', () => {
    const coupon: Coupon = {
      code: 'MIN100', discountType: DiscountType.FLAT, discountValue: 20,
      minRideFare: 100, usedCount: 0, isActive: true,
    };
    const fare = pricing.calculateFare({
      distanceKm: 10, billedCarType: CarType.HATCHBACK, assignedCarType: CarType.HATCHBACK, isUpgraded: false, coupon,
    });
    expect(fare.discountAmount).toBe(0);
    expect(fare.finalFare).toBe(69);
  });

  it('applies surge multiplier', () => {
    const surge = new DemandSupplySurgeCalculator();
    const mult = surge.getSurgeMultiplier(10, 5); // ratio 2 → 1.5x
    expect(mult).toBe(1.5);

    const fare = pricing.calculateFare({
      distanceKm: 10, billedCarType: CarType.HATCHBACK, assignedCarType: CarType.HATCHBACK,
      isUpgraded: false, surgeMultiplier: mult,
    });
    expect(fare.fareAfterSurge).toBe(103.5);
    expect(fare.finalFare).toBe(103.5);
  });
});
