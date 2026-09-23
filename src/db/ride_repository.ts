import { Ride, RideStatus } from '../models/ride.js';
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
    const ride = this.store.rides.get(id);
    return ride ? { ...ride } : null;
  }

  public findAll(): Ride[] {
    return Array.from(this.store.rides.values()).map(r => ({ ...r }));
  }

  public update(ride: Ride): Ride {
    this.store.rides.set(ride.id, { ...ride });
    return this.store.rides.get(ride.id)!;
  }

  // --- History Queries for User ---

  public findByUserId(userId: string): Ride[] {
    return Array.from(this.store.rides.values())
      .filter(r => r.userId === userId)
      .map(r => ({ ...r }));
  }

  public findOngoingRidesByUserId(userId: string): Ride[] {
    return Array.from(this.store.rides.values())
      .filter(r => r.userId === userId && (r.status === RideStatus.REQUESTED || r.status === RideStatus.ONGOING))
      .map(r => ({ ...r }));
  }

  public findCompletedRidesByUserId(userId: string): Ride[] {
    return Array.from(this.store.rides.values())
      .filter(r => r.userId === userId && r.status === RideStatus.COMPLETED)
      .map(r => ({ ...r }));
  }

  // --- History Queries for Driver ---

  public findByDriverId(driverId: string): Ride[] {
    return Array.from(this.store.rides.values())
      .filter(r => r.driverId === driverId)
      .map(r => ({ ...r }));
  }

  public findOngoingRidesByDriverId(driverId: string): Ride[] {
    return Array.from(this.store.rides.values())
      .filter(r => r.driverId === driverId && (r.status === RideStatus.REQUESTED || r.status === RideStatus.ONGOING))
      .map(r => ({ ...r }));
  }

  public findCompletedRidesByDriverId(driverId: string): Ride[] {
    return Array.from(this.store.rides.values())
      .filter(r => r.driverId === driverId && r.status === RideStatus.COMPLETED)
      .map(r => ({ ...r }));
  }
}
