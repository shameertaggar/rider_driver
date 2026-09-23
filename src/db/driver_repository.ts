import { Driver, Cab, DriverStatus, Location } from '../models/index.js';
import { InMemoryStore } from './in_memory_store.js';

export class DriverRepository {
  private store: InMemoryStore;

  constructor(store: InMemoryStore = InMemoryStore.getInstance()) {
    this.store = store;
  }

  // ── Driver CRUD ──

  public saveDriver(driver: Driver): Driver {
    this.store.drivers.set(driver.id, { ...driver });
    return this.store.drivers.get(driver.id)!;
  }

  public findDriverById(id: string): Driver | null {
    const d = this.store.drivers.get(id);
    if (!d) return null;
    return { ...d, cab: this.findCabByDriverId(d.id) || undefined };
  }

  public findAllDrivers(): Driver[] {
    return Array.from(this.store.drivers.values()).map(d => ({
      ...d,
      cab: this.findCabByDriverId(d.id) || undefined,
    }));
  }

  public updateDriverStatus(driverId: string, status: DriverStatus): boolean {
    const d = this.store.drivers.get(driverId);
    if (!d) return false;
    d.status = status;
    return true;
  }

  // ── Cab CRUD ──

  public saveCab(cab: Cab): Cab {
    this.store.cabs.set(cab.id, { ...cab });
    const driver = this.store.drivers.get(cab.driverId);
    if (driver) driver.cab = { ...cab };
    return this.store.cabs.get(cab.id)!;
  }

  public findCabById(id: string): Cab | null {
    const c = this.store.cabs.get(id);
    return c ? { ...c } : null;
  }

  public findCabByDriverId(driverId: string): Cab | null {
    for (const cab of this.store.cabs.values()) {
      if (cab.driverId === driverId) return { ...cab };
    }
    return null;
  }

  public updateCabLocation(cabId: string, location: Location): boolean {
    const cab = this.store.cabs.get(cabId);
    if (!cab) return false;
    cab.currentLocation = { ...location };
    const driver = this.store.drivers.get(cab.driverId);
    if (driver?.cab) driver.cab.currentLocation = { ...location };
    return true;
  }

  // ── Queries for matching ──

  public findAvailableDriversWithCabs(): Array<{ driver: Driver; cab: Cab }> {
    const results: Array<{ driver: Driver; cab: Cab }> = [];
    for (const driver of this.store.drivers.values()) {
      if (driver.status === DriverStatus.AVAILABLE) {
        const cab = this.findCabByDriverId(driver.id);
        if (cab) results.push({ driver: { ...driver, cab }, cab: { ...cab } });
      }
    }
    return results;
  }

  // ── Concurrency locks ──

  public acquireDriverLock(driverId: string): boolean {
    return this.store.acquireDriverLock(driverId);
  }

  public releaseDriverLock(driverId: string): void {
    this.store.releaseDriverLock(driverId);
  }
}
