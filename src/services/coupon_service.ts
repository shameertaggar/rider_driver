import { Coupon } from '../models/modelsIndex.js';
import { CouponRepository } from '../db/dbIndex.js';

export class CouponService {
  private couponRepo: CouponRepository;

  constructor(couponRepo = new CouponRepository()) {
    this.couponRepo = couponRepo;
  }

  public addCoupon(coupon: Omit<Coupon, 'usedCount' | 'isActive'> & { usedCount?: number; isActive?: boolean }): Coupon {
    if (!coupon.code?.trim()) {
      throw new Error('Coupon code is required');
    }
    const cleanCode = coupon.code.toUpperCase().trim();
    if (this.couponRepo.findByCode(cleanCode)) {
      throw new Error(`Duplicate coupon code: '${cleanCode}' already exists`);
    }
    if (coupon.discountValue === undefined || coupon.discountValue < 0) {
      throw new Error('Discount value cannot be negative or missing');
    }
    if (coupon.discountType === 'PERCENTAGE' && coupon.discountValue > 100) {
      throw new Error('Discount percentage cannot exceed 100%');
    }

    return this.couponRepo.save({
      ...coupon,
      code: cleanCode,
      usedCount: coupon.usedCount ?? 0,
      isActive: coupon.isActive ?? true,
    });
  }

  public deleteCoupon(code: string): boolean {
    return this.couponRepo.delete(code);
  }

  public getCoupon(code: string): Coupon | null {
    return this.couponRepo.findByCode(code);
  }

  public getAllCoupons(): Coupon[] {
    return this.couponRepo.findAll();
  }

  public validateCoupon(code: string, fareAmount?: number): { valid: boolean; coupon?: Coupon; reason?: string } {
    const coupon = this.getCoupon(code);
    if (!coupon) return { valid: false, reason: `Coupon '${code}' not found` };
    if (!coupon.isActive) return { valid: false, reason: `Coupon '${code}' is inactive` };
    if (coupon.expiryDate && new Date() > coupon.expiryDate) return { valid: false, reason: `Coupon '${code}' has expired` };
    if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) return { valid: false, reason: `Coupon '${code}' usage limit exceeded` };
    if (fareAmount !== undefined && coupon.minRideFare && fareAmount < coupon.minRideFare) {
      return { valid: false, reason: `Coupon '${code}' requires minimum fare ₹${coupon.minRideFare}` };
    }
    return { valid: true, coupon };
  }
}
