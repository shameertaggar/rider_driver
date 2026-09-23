import { User, Driver, Cab, Ride, Coupon } from '../models/index.js';

/**
 * InMemoryStore acts as the central in-memory database storage.
 * Stores tables in dedicated maps and provides atomic lock utilities for concurrency.
 */
export class InMemoryStore {
  private static instance: InMemoryStore;

  public users: Map<string, User> = new Map();
  public drivers: Map<string, Driver> = new Map();
  public cabs: Map<string, Cab> = new Map();
  public rides: Map<string, Ride> = new Map();
  public coupons: Map<string, Coupon> = new Map();

  // Concurrency lock sets for preventing race conditions (e.g. 2 riders booking same driver)
  private driverLocks: Set<string> = new Set();

  private constructor() {}

  public static getInstance(): InMemoryStore {
    if (!InMemoryStore.instance) {
      InMemoryStore.instance = new InMemoryStore();
    }
    return InMemoryStore.instance;
  }

  /**
   * Resets all tables in the database. Essential for unit tests.
   */
  public clearAll(): void {
    this.users.clear();
    this.drivers.clear();
    this.cabs.clear();
    this.rides.clear();
    this.coupons.clear();
    this.driverLocks.clear();
  }

  /**
   * Atomically acquires a lock on a driver.
   * Returns true if lock was acquired, false if driver was already locked.
   */
  public acquireDriverLock(driverId: string): boolean {
    if (this.driverLocks.has(driverId)) {
      return false;
    }
    this.driverLocks.add(driverId);
    return true;
  }

  /**
   * Releases a lock on a driver.
   */
  public releaseDriverLock(driverId: string): void {
    this.driverLocks.delete(driverId);
  }
}
