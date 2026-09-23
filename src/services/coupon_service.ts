import { Coupon } from '../models/index.js';
import { CouponRepository } from '../db/index.js';

export class CouponService {
  private couponRepo: CouponRepository;

  constructor(couponRepo = new CouponRepository()) {
    this.couponRepo = couponRepo;
  }

  public addCoupon(coupon: Omit<Coupon, 'usedCount'> & { usedCount?: number }): Coupon {
    return this.couponRepo.save({
      ...coupon,
      code: coupon.code.toUpperCase().trim(),
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
