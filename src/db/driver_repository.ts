import { Driver, Cab, DriverStatus } from '../models/driver.js';
import { Location } from '../models/location.js';
import { InMemoryStore } from './in_memory_store.js';

export class DriverRepository {
  private store: InMemoryStore;

  constructor(store: InMemoryStore = InMemoryStore.getInstance()) {
    this.store = store;
  }

  // --- Driver Operations ---

  public saveDriver(driver: Driver): Driver {
    this.store.drivers.set(driver.id, { ...driver });
    return this.store.drivers.get(driver.id)!;
  }

  public findDriverById(id: string): Driver | null {
    const driver = this.store.drivers.get(id);
    if (!driver) return null;
    const cab = this.findCabByDriverId(driver.id);
    return {
      ...driver,
      cab: cab || undefined,
    };
  }

  public findAllDrivers(): Driver[] {
    return Array.from(this.store.drivers.values()).map(d => ({
      ...d,
      cab: this.findCabByDriverId(d.id) || undefined,
    }));
  }

  public updateDriverStatus(driverId: string, status: DriverStatus): boolean {
    const driver = this.store.drivers.get(driverId);
    if (!driver) return false;
    driver.status = status;
    this.store.drivers.set(driverId, driver);
    return true;
  }

  // --- Cab Operations ---

  public saveCab(cab: Cab): Cab {
    this.store.cabs.set(cab.id, { ...cab });
    // Also associate with driver if exists
    const driver = this.store.drivers.get(cab.driverId);
    if (driver) {
      driver.cab = { ...cab };
    }
    return this.store.cabs.get(cab.id)!;
  }

  public findCabById(id: string): Cab | null {
    const cab = this.store.cabs.get(id);
    return cab ? { ...cab } : null;
  }

  public findCabByDriverId(driverId: string): Cab | null {
    for (const cab of this.store.cabs.values()) {
      if (cab.driverId === driverId) {
        return { ...cab };
      }
    }
    return null;
  }

  public updateCabLocation(cabId: string, location: Location): boolean {
    const cab = this.store.cabs.get(cabId);
    if (!cab) return false;
    cab.currentLocation = { ...location };
    this.store.cabs.set(cabId, cab);

    const driver = this.store.drivers.get(cab.driverId);
    if (driver && driver.cab) {
      driver.cab.currentLocation = { ...location };
    }
    return true;
  }

  // --- Matching & Query Operations ---

  public findAvailableDriversWithCabs(): Array<{ driver: Driver; cab: Cab }> {
    const results: Array<{ driver: Driver; cab: Cab }> = [];
    for (const driver of this.store.drivers.values()) {
      if (driver.status === DriverStatus.AVAILABLE) {
        const cab = this.findCabByDriverId(driver.id);
        if (cab) {
          results.push({
            driver: { ...driver, cab },
            cab: { ...cab },
          });
        }
      }
    }
    return results;
  }

  // --- Concurrency Atomic Locks ---

  public acquireDriverLock(driverId: string): boolean {
    return this.store.acquireDriverLock(driverId);
  }

  public releaseDriverLock(driverId: string): void {
    this.store.releaseDriverLock(driverId);
  }
}
