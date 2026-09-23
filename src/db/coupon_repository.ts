import { Coupon } from '../models/index.js';
import { InMemoryStore } from './in_memory_store.js';

export class CouponRepository {
  private store: InMemoryStore;

  constructor(store: InMemoryStore = InMemoryStore.getInstance()) {
    this.store = store;
  }

  public save(coupon: Coupon): Coupon {
    const code = coupon.code.toUpperCase().trim();
    const toSave: Coupon = { ...coupon, code };
    this.store.coupons.set(code, toSave);
    return { ...this.store.coupons.get(code)! };
  }

  public findByCode(code: string): Coupon | null {
    const c = this.store.coupons.get(code.toUpperCase().trim());
    return c ? { ...c } : null;
  }

  public findAll(): Coupon[] {
    return Array.from(this.store.coupons.values()).map(c => ({ ...c }));
  }

  public delete(code: string): boolean {
    return this.store.coupons.delete(code.toUpperCase().trim());
  }

  public incrementUsage(code: string): boolean {
    const c = this.store.coupons.get(code.toUpperCase().trim());
    if (!c) return false;
    c.usedCount += 1;
    return true;
  }
}
