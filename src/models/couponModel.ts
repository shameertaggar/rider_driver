export enum DiscountType {
  PERCENTAGE = 'PERCENTAGE',
  FLAT = 'FLAT',
}

export interface Coupon {
  code: string;
  discountType: DiscountType;
  discountValue: number;
  maxDiscount?: number;
  minRideFare?: number;
  expiryDate?: Date;
  usageLimit?: number;
  usedCount: number;
  isActive: boolean;
}
