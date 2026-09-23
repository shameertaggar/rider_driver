import { User, Driver, Cab, Ride, Coupon } from '../models/index.js';

/**
 * InMemoryStore — Central in-memory database singleton.
 * All data lives in Maps keyed by entity ID.
 * Provides atomic driver locks for concurrency safety.
 */
export class InMemoryStore {
  private static instance: InMemoryStore;

  public users: Map<string, User> = new Map();
  public drivers: Map<string, Driver> = new Map();
  public cabs: Map<string, Cab> = new Map();
  public rides: Map<string, Ride> = new Map();
  public coupons: Map<string, Coupon> = new Map();

  // Concurrency: driver lock set prevents two riders booking the same driver
  private driverLocks: Set<string> = new Set();

  private constructor() {}

  public static getInstance(): InMemoryStore {
    if (!InMemoryStore.instance) {
      InMemoryStore.instance = new InMemoryStore();
    }
    return InMemoryStore.instance;
  }

  /** Wipe all tables — essential for test isolation. */
  public clearAll(): void {
    this.users.clear();
    this.drivers.clear();
    this.cabs.clear();
    this.rides.clear();
    this.coupons.clear();
    this.driverLocks.clear();
  }

  /** Atomically acquire a lock on a driver. Returns false if already locked. */
  public acquireDriverLock(driverId: string): boolean {
    if (this.driverLocks.has(driverId)) return false;
    this.driverLocks.add(driverId);
    return true;
  }

  /** Release a driver lock. */
  public releaseDriverLock(driverId: string): void {
    this.driverLocks.delete(driverId);
  }
}
