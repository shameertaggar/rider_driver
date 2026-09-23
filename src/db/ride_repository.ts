import { Ride, RideStatus } from '../models/modelsIndex.js';
import { InMemoryStore } from './in_memory_store.js';

export class RideRepository {
  private store: InMemoryStore;

  constructor(store: InMemoryStore = InMemoryStore.getInstance()) {
    this.store = store;
  }

  public save(ride: Ride): Ride {
    this.store.rides.set(ride.id, { ...ride });
    return this.store.rides.get(ride.id)!;
  }

  public findById(id: string): Ride | null {
    const r = this.store.rides.get(id);
    return r ? { ...r } : null;
  }

  public findAll(): Ride[] {
    return Array.from(this.store.rides.values()).map(r => ({ ...r }));
  }

  public update(ride: Ride): Ride {
    this.store.rides.set(ride.id, { ...ride });
    return this.store.rides.get(ride.id)!;
  }

  // ── User history queries ──

  public findByUserId(userId: string): Ride[] {
    return Array.from(this.store.rides.values())
      .filter(r => r.userId === userId)
      .map(r => ({ ...r }));
  }

  public findOngoingRidesByUserId(userId: string): Ride[] {
    return this.findByUserId(userId)
      .filter(r => r.status === RideStatus.REQUESTED || r.status === RideStatus.ONGOING);
  }

  public findCompletedRidesByUserId(userId: string): Ride[] {
    return this.findByUserId(userId).filter(r => r.status === RideStatus.COMPLETED);
  }

  // ── Driver history queries ──

  public findByDriverId(driverId: string): Ride[] {
    return Array.from(this.store.rides.values())
      .filter(r => r.driverId === driverId)
      .map(r => ({ ...r }));
  }

  public findOngoingRidesByDriverId(driverId: string): Ride[] {
    return this.findByDriverId(driverId)
      .filter(r => r.status === RideStatus.REQUESTED || r.status === RideStatus.ONGOING);
  }

  public findCompletedRidesByDriverId(driverId: string): Ride[] {
    return this.findByDriverId(driverId).filter(r => r.status === RideStatus.COMPLETED);
  }
}
