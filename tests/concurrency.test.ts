import { describe, it, expect, beforeEach } from 'vitest';
import { InMemoryStore } from '../src/db/in_memory_store.js';
import { UserService } from '../src/services/user_service.js';
import { DriverService } from '../src/services/driver_service.js';
import { RideService } from '../src/services/ride_service.js';
import { CarType } from '../src/models/index.js';

describe('Concurrency Safety', () => {
  beforeEach(() => {
    InMemoryStore.getInstance().clearAll();
  });

  it('prevents two users from booking the same driver simultaneously', async () => {
    const userService = new UserService();
    const driverService = new DriverService();
    const rideService = new RideService();

    userService.registerUser({ id: 'u1', name: 'User1' });
    userService.registerUser({ id: 'u2', name: 'User2' });
    driverService.registerDriver({ id: 'd1', name: 'OnlyDriver' });
    driverService.registerCab({
      id: 'c1', driverId: 'd1', carType: CarType.HATCHBACK,
      licensePlate: 'KA-01-9999', initialLocation: { x: 0, y: 0 },
    });

    const attempt1 = () => rideService.bookRide({
      userId: 'u1', pickupLocation: { x: 0, y: 0 },
      dropLocation: { x: 5, y: 5 }, requestedCarType: CarType.HATCHBACK,
    });
    const attempt2 = () => rideService.bookRide({
      userId: 'u2', pickupLocation: { x: 0, y: 0 },
      dropLocation: { x: 10, y: 10 }, requestedCarType: CarType.HATCHBACK,
    });

    const results = await Promise.allSettled([
      new Promise((resolve, reject) => { try { resolve(attempt1()); } catch (e) { reject(e); } }),
      new Promise((resolve, reject) => { try { resolve(attempt2()); } catch (e) { reject(e); } }),
    ]);

    const fulfilled = results.filter(r => r.status === 'fulfilled');
    const rejected = results.filter(r => r.status === 'rejected');

    // Exactly 1 succeeds, 1 fails
    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect(driverService.getDriver('d1').status).toBe('ON_TRIP');
  });
});
