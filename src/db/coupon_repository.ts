import { Coupon } from '../models/coupon.js';
import { InMemoryStore } from './in_memory_store.js';

export class CouponRepository {
  private store: InMemoryStore;

  constructor(store: InMemoryStore = InMemoryStore.getInstance()) {
    this.store = store;
  }

  public save(coupon: Coupon): Coupon {
    const normalizedCode = coupon.code.toUpperCase().trim();
    const toSave: Coupon = { ...coupon, code: normalizedCode };
    this.store.coupons.set(normalizedCode, toSave);
    return { ...this.store.coupons.get(normalizedCode)! };
  }

  public findByCode(code: string): Coupon | null {
    const normalizedCode = code.toUpperCase().trim();
    const coupon = this.store.coupons.get(normalizedCode);
    return coupon ? { ...coupon } : null;
  }

  public findAll(): Coupon[] {
    return Array.from(this.store.coupons.values()).map(c => ({ ...c }));
  }

  public delete(code: string): boolean {
    const normalizedCode = code.toUpperCase().trim();
    return this.store.coupons.delete(normalizedCode);
  }

  public incrementUsage(code: string): boolean {
    const normalizedCode = code.toUpperCase().trim();
    const coupon = this.store.coupons.get(normalizedCode);
    if (!coupon) return false;
    coupon.usedCount += 1;
    this.store.coupons.set(normalizedCode, coupon);
    return true;
  }
}
