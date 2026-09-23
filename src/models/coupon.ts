export enum DiscountType {
  PERCENTAGE = 'PERCENTAGE',
  FLAT = 'FLAT',
}

export interface Coupon {
  code: string;
  discountType: DiscountType;
  discountValue: number; // e.g. 20 for 20% or 50 for flat ₹50
  maxDiscount?: number; // Cap for percentage discount (e.g. max ₹100)
  minRideFare?: number; // Minimum fare required to apply
  expiryDate?: Date;
  usageLimit?: number; // Max total redemptions
  usedCount: number;
  isActive: boolean;
}
