import { describe, it, expect, beforeEach } from 'vitest';
import { InMemoryStore } from '../src/db/in_memory_store.js';
import { UserService } from '../src/services/user_service.js';
import { DriverService } from '../src/services/driver_service.js';
import { RideService } from '../src/services/ride_service.js';
import { CarType, DriverStatus, RideStatus } from '../src/models/modelsIndex.js';

describe('Ride Lifecycle', () => {
  let userService: UserService;
  let driverService: DriverService;
  let rideService: RideService;

  beforeEach(() => {
    InMemoryStore.getInstance().clearAll();
    userService = new UserService();
    driverService = new DriverService();
    rideService = new RideService();
  });

  it('registers users, drivers, and links cabs', () => {
    const user = userService.registerUser({ id: 'u1', name: 'Alice' });
    const driver = driverService.registerDriver({ id: 'd1', name: 'Bob', rating: 4.8 });
    const cab = driverService.registerCab({
      id: 'c1', driverId: 'd1', carType: CarType.HATCHBACK,
      licensePlate: 'KA-01-1234', initialLocation: { x: 0, y: 0 },
    });

    expect(user.name).toBe('Alice');
    expect(driver.rating).toBe(4.8);
    expect(driver.status).toBe(DriverStatus.AVAILABLE);
    expect(cab.driverId).toBe('d1');
  });

  it('handles full lifecycle: Book → Start → End → fare calculated', () => {
    userService.registerUser({ id: 'u1', name: 'Alice' });
    driverService.registerDriver({ id: 'd1', name: 'Bob' });
    driverService.registerCab({
      id: 'c1', driverId: 'd1', carType: CarType.HATCHBACK,
      licensePlate: 'KA-01-1234', initialLocation: { x: 0, y: 0 },
    });

    // Book (pickup (0,0) → drop (6,8) = 10 km)
    const ride = rideService.bookRide({
      userId: 'u1', pickupLocation: { x: 0, y: 0 },
      dropLocation: { x: 6, y: 8 }, requestedCarType: CarType.HATCHBACK,
    });
    expect(ride.status).toBe(RideStatus.REQUESTED);
    expect(driverService.getDriver('d1').status).toBe(DriverStatus.ON_TRIP);

    // Start
    const started = rideService.startRide(ride.id);
    expect(started.status).toBe(RideStatus.ONGOING);

    // End
    const completed = rideService.endRide(ride.id);
    expect(completed.status).toBe(RideStatus.COMPLETED);
    expect(completed.distanceKm).toBe(10);
    expect(completed.fareBreakdown?.finalFare).toBe(69); // 20+24+25
    expect(driverService.getDriver('d1').status).toBe(DriverStatus.AVAILABLE);
    expect(driverService.getDriver('d1').cab?.currentLocation).toEqual({ x: 6, y: 8 });
  });

  it('maintains user & driver ride history (ongoing + completed)', () => {
    userService.registerUser({ id: 'u1', name: 'Alice' });
    driverService.registerDriver({ id: 'd1', name: 'Bob' });
    driverService.registerCab({
      id: 'c1', driverId: 'd1', carType: CarType.HATCHBACK,
      licensePlate: 'KA-01-1234', initialLocation: { x: 0, y: 0 },
    });

    // Ride 1: complete it
    const r1 = rideService.bookRide({
      userId: 'u1', pickupLocation: { x: 0, y: 0 },
      dropLocation: { x: 1, y: 1 }, requestedCarType: CarType.HATCHBACK,
    });
    rideService.startRide(r1.id);
    rideService.endRide(r1.id);

    // Ride 2: leave it ongoing
    const r2 = rideService.bookRide({
      userId: 'u1', pickupLocation: { x: 1, y: 1 },
      dropLocation: { x: 2, y: 2 }, requestedCarType: CarType.HATCHBACK,
    });
    rideService.startRide(r2.id);

    const userHistory = userService.getUserRideHistory('u1');
    expect(userHistory.completed).toHaveLength(1);
    expect(userHistory.ongoing).toHaveLength(1);

    const driverHistory = driverService.getDriverRideHistory('d1');
    expect(driverHistory.completed).toHaveLength(1);
    expect(driverHistory.ongoing).toHaveLength(1);
  });

  it('cancels ride before start with ₹0 fee', () => {
    userService.registerUser({ id: 'u1', name: 'Alice' });
    driverService.registerDriver({ id: 'd1', name: 'Bob' });
    driverService.registerCab({
      id: 'c1', driverId: 'd1', carType: CarType.HATCHBACK,
      licensePlate: 'KA-01-1234', initialLocation: { x: 0, y: 0 },
    });

    const ride = rideService.bookRide({
      userId: 'u1', pickupLocation: { x: 0, y: 0 },
      dropLocation: { x: 2, y: 2 }, requestedCarType: CarType.HATCHBACK,
    });
    const cancelled = rideService.cancelRide(ride.id, 'Changed mind');
    expect(cancelled.status).toBe(RideStatus.CANCELLED);
    expect(cancelled.cancellationFee).toBe(0);
    expect(driverService.getDriver('d1').status).toBe(DriverStatus.AVAILABLE);
  });

  it('cancels ride after start with ₹30 fee', () => {
    userService.registerUser({ id: 'u1', name: 'Alice' });
    driverService.registerDriver({ id: 'd1', name: 'Bob' });
    driverService.registerCab({
      id: 'c1', driverId: 'd1', carType: CarType.HATCHBACK,
      licensePlate: 'KA-01-1234', initialLocation: { x: 0, y: 0 },
    });

    const ride = rideService.bookRide({
      userId: 'u1', pickupLocation: { x: 0, y: 0 },
      dropLocation: { x: 2, y: 2 }, requestedCarType: CarType.HATCHBACK,
    });
    rideService.startRide(ride.id);
    const cancelled = rideService.cancelRide(ride.id, 'Driver delayed');
    expect(cancelled.status).toBe(RideStatus.CANCELLED);
    expect(cancelled.cancellationFee).toBe(30);
  });

  it('throws when no drivers within radius', () => {
    userService.registerUser({ id: 'u1', name: 'Alice' });
    driverService.registerDriver({ id: 'd1', name: 'Bob' });
    driverService.registerCab({
      id: 'c1', driverId: 'd1', carType: CarType.HATCHBACK,
      licensePlate: 'KA-01-1234', initialLocation: { x: 100, y: 100 },
    });

    expect(() =>
      rideService.bookRide({
        userId: 'u1', pickupLocation: { x: 0, y: 0 },
        dropLocation: { x: 5, y: 5 }, requestedCarType: CarType.HATCHBACK,
      })
    ).toThrow(/No drivers available within/);
  });

  it('prevents a rider from booking a new ride while an active ride is REQUESTED or ONGOING', () => {
    userService.registerUser({ id: 'u1', name: 'Alice' });
    driverService.registerDriver({ id: 'd1', name: 'Driver1' });
    driverService.registerCab({
      id: 'c1', driverId: 'd1', carType: CarType.HATCHBACK,
      licensePlate: 'KA-01-1111', initialLocation: { x: 0, y: 0 },
    });
    driverService.registerDriver({ id: 'd2', name: 'Driver2' });
    driverService.registerCab({
      id: 'c2', driverId: 'd2', carType: CarType.HATCHBACK,
      licensePlate: 'KA-01-2222', initialLocation: { x: 1, y: 1 },
    });

    // 1. Book first ride (status: REQUESTED)
    const r1 = rideService.bookRide({
      userId: 'u1', pickupLocation: { x: 0, y: 0 },
      dropLocation: { x: 2, y: 2 }, requestedCarType: CarType.HATCHBACK,
    });

    // 2. Attempt to book second ride while first is REQUESTED → throws
    expect(() =>
      rideService.bookRide({
        userId: 'u1', pickupLocation: { x: 0, y: 0 },
        dropLocation: { x: 3, y: 3 }, requestedCarType: CarType.HATCHBACK,
      })
    ).toThrow(/already has an active ride/);

    // 3. Start first ride (status: ONGOING)
    rideService.startRide(r1.id);

    // 4. Attempt to book while ONGOING → still throws
    expect(() =>
      rideService.bookRide({
        userId: 'u1', pickupLocation: { x: 0, y: 0 },
        dropLocation: { x: 3, y: 3 }, requestedCarType: CarType.HATCHBACK,
      })
    ).toThrow(/already has an active ride/);

    // 5. Complete first ride
    rideService.endRide(r1.id);

    // 6. Now booking a new ride succeeds
    const r2 = rideService.bookRide({
      userId: 'u1', pickupLocation: { x: 0, y: 0 },
      dropLocation: { x: 3, y: 3 }, requestedCarType: CarType.HATCHBACK,
    });
    expect(r2.id).toBeDefined();

    // 7. Cancel r2
    rideService.cancelRide(r2.id, 'User cancelled');

    // 8. Booking again succeeds after cancellation
    const r3 = rideService.bookRide({
      userId: 'u1', pickupLocation: { x: 0, y: 0 },
      dropLocation: { x: 4, y: 4 }, requestedCarType: CarType.HATCHBACK,
    });
    expect(r3.id).toBeDefined();
  });
});
