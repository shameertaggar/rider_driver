import { describe, it, expect, beforeEach } from 'vitest';
import {
  UserService, DriverService, RideService, CouponService,
} from '../src/services/servicesIndex.js';
import {
  UserRepository, DriverRepository, RideRepository, CouponRepository, InMemoryStore,
} from '../src/db/dbIndex.js';
import {
  CarType, DriverStatus, RideStatus, validateLocation, validateGeoCoordinates, DiscountType,
} from '../src/models/modelsIndex.js';
import { TieredPricingStrategy } from '../src/strategies/pricing/pricingIndex.js';
import { NearestDriverMatchingStrategy } from '../src/strategies/matching/matchingIndex.js';
import { EuclideanDistanceStrategy } from '../src/strategies/distance/distanceIndex.js';

describe('Comprehensive Edge Cases Checklist Tests', () => {
  let userRepo: UserRepository;
  let driverRepo: DriverRepository;
  let rideRepo: RideRepository;
  let couponRepo: CouponRepository;
  let userService: UserService;
  let driverService: DriverService;
  let couponService: CouponService;
  let rideService: RideService;
  let pricing: TieredPricingStrategy;

  beforeEach(() => {
    InMemoryStore.getInstance().clearAll();
    userRepo = new UserRepository();
    driverRepo = new DriverRepository();
    rideRepo = new RideRepository();
    couponRepo = new CouponRepository();
    userService = new UserService(userRepo, rideRepo);
    driverService = new DriverService(driverRepo, rideRepo);
    couponService = new CouponService(couponRepo);
    pricing = new TieredPricingStrategy();
    rideService = new RideService(userRepo, driverRepo, rideRepo, couponRepo, pricing, new NearestDriverMatchingStrategy(), new EuclideanDistanceStrategy());
  });

  // ==========================================
  // 1. User Edge Cases
  // ==========================================
  describe('User Edge Cases', () => {
    it('User does not exist - throws error', () => {
      expect(() => userService.getUser('non_existent')).toThrow('User non_existent not found');
    });

    it('Empty user name - throws error', () => {
      expect(() => userService.registerUser({ id: 'u1', name: '' })).toThrow('User ID and Name are required');
      expect(() => userService.registerUser({ id: 'u1', name: '   ' })).toThrow('User ID and Name are required');
    });

    it('Missing required fields - throws error', () => {
      expect(() => userService.registerUser({ id: '', name: 'Alice' })).toThrow('User ID and Name are required');
    });
  });

  // ==========================================
  // 2. Driver Edge Cases
  // ==========================================
  describe('Driver Edge Cases', () => {
    it('Driver does not exist - throws error', () => {
      expect(() => driverService.getDriver('non_existent')).toThrow('Driver non_existent not found');
    });

    it('Empty driver name - throws error', () => {
      expect(() => driverService.registerDriver({ id: 'd1', name: '' })).toThrow('Driver ID and Name are required');
      expect(() => driverService.registerDriver({ id: 'd1', name: '  ' })).toThrow('Driver ID and Name are required');
    });

    it('Invalid car type - throws error on cab registration', () => {
      driverService.registerDriver({ id: 'd1', name: 'Driver 1' });
      expect(() =>
        driverService.registerCab({
          id: 'c1',
          driverId: 'd1',
          carType: 'HELICOPTER' as unknown as CarType,
          licensePlate: 'ABC-123',
          initialLocation: { x: 0, y: 0 },
        })
      ).toThrow('Invalid or missing car type');
    });

    it('Missing car type - throws error', () => {
      driverService.registerDriver({ id: 'd1', name: 'Driver 1' });
      expect(() =>
        driverService.registerCab({
          id: 'c1',
          driverId: 'd1',
          carType: undefined as unknown as CarType,
          licensePlate: 'ABC-123',
          initialLocation: { x: 0, y: 0 },
        })
      ).toThrow('Invalid or missing car type');
    });

    it('Invalid latitude/longitude in cab location - throws error', () => {
      driverService.registerDriver({ id: 'd1', name: 'Driver 1' });
      expect(() =>
        driverService.registerCab({
          id: 'c1',
          driverId: 'd1',
          carType: CarType.HATCHBACK,
          licensePlate: 'ABC-123',
          initialLocation: { x: 0, y: 0, latitude: 100, longitude: 50 },
        })
      ).toThrow('Invalid latitude');

      expect(() =>
        driverService.registerCab({
          id: 'c1',
          driverId: 'd1',
          carType: CarType.HATCHBACK,
          licensePlate: 'ABC-123',
          initialLocation: { x: 0, y: 0, latitude: 45, longitude: 200 },
        })
      ).toThrow('Invalid longitude');
    });

    it('Driver already on a ride - cannot change status to AVAILABLE while on active ride', () => {
      userService.registerUser({ id: 'u1', name: 'Rider 1' });
      driverService.registerDriver({ id: 'd1', name: 'Driver 1' });
      driverService.registerCab({
        id: 'c1',
        driverId: 'd1',
        carType: CarType.HATCHBACK,
        licensePlate: 'ABC-123',
        initialLocation: { x: 0, y: 0 },
      });

      rideService.bookRide({
        userId: 'u1',
        pickupLocation: { x: 0, y: 0 },
        dropLocation: { x: 2, y: 0 },
        requestedCarType: CarType.HATCHBACK,
      });

      // Attempt to set driver to AVAILABLE while ride is active
      expect(() => driverService.updateDriverStatus('d1', DriverStatus.AVAILABLE)).toThrow(
        'The current ride must be cancelled or completed before becoming available'
      );
    });
  });

  // ==========================================
  // 3. Driver Matching Edge Cases
  // ==========================================
  describe('Driver Matching Edge Cases', () => {
    beforeEach(() => {
      userService.registerUser({ id: 'u1', name: 'Rider 1' });
    });

    it('No driver available - throws when driver pool is empty', () => {
      expect(() =>
        rideService.bookRide({
          userId: 'u1',
          pickupLocation: { x: 0, y: 0 },
          dropLocation: { x: 2, y: 0 },
          requestedCarType: CarType.HATCHBACK,
        })
      ).toThrow('No drivers currently available');
    });

    it('No driver within radius & Driver outside radius', () => {
      driverService.registerDriver({ id: 'd1', name: 'Driver 1' });
      driverService.registerCab({
        id: 'c1',
        driverId: 'd1',
        carType: CarType.HATCHBACK,
        licensePlate: 'ABC-1',
        initialLocation: { x: 10, y: 0 }, // 10 km away
      });

      expect(() =>
        rideService.bookRide({
          userId: 'u1',
          pickupLocation: { x: 0, y: 0 },
          dropLocation: { x: 2, y: 0 },
          requestedCarType: CarType.HATCHBACK,
          maxRadiusKm: 5.0,
        })
      ).toThrow('No drivers available within 5 km radius');
    });

    it('Driver exactly on radius boundary - included', () => {
      driverService.registerDriver({ id: 'd1', name: 'Driver 1' });
      driverService.registerCab({
        id: 'c1',
        driverId: 'd1',
        carType: CarType.HATCHBACK,
        licensePlate: 'ABC-1',
        initialLocation: { x: 5, y: 0 }, // exactly 5.0 km
      });

      const ride = rideService.bookRide({
        userId: 'u1',
        pickupLocation: { x: 0, y: 0 },
        dropLocation: { x: 2, y: 0 },
        requestedCarType: CarType.HATCHBACK,
        maxRadiusKm: 5.0,
      });

      expect(ride.driverId).toBe('d1');
    });

    it('Driver outside radius - excluded (e.g. 5.01 km)', () => {
      driverService.registerDriver({ id: 'd1', name: 'Driver 1' });
      driverService.registerCab({
        id: 'c1',
        driverId: 'd1',
        carType: CarType.HATCHBACK,
        licensePlate: 'ABC-1',
        initialLocation: { x: 5.01, y: 0 },
      });

      expect(() =>
        rideService.bookRide({
          userId: 'u1',
          pickupLocation: { x: 0, y: 0 },
          dropLocation: { x: 2, y: 0 },
          requestedCarType: CarType.HATCHBACK,
          maxRadiusKm: 5.0,
        })
      ).toThrow('No drivers available within 5 km radius');
    });

    it('Multiple drivers available & Nearest driver selection', () => {
      driverService.registerDriver({ id: 'd_far', name: 'Far' });
      driverService.registerCab({
        id: 'c_far',
        driverId: 'd_far',
        carType: CarType.HATCHBACK,
        licensePlate: 'ABC-1',
        initialLocation: { x: 4, y: 0 },
      });

      driverService.registerDriver({ id: 'd_near', name: 'Near' });
      driverService.registerCab({
        id: 'c_near',
        driverId: 'd_near',
        carType: CarType.HATCHBACK,
        licensePlate: 'ABC-2',
        initialLocation: { x: 1, y: 0 },
      });

      const ride = rideService.bookRide({
        userId: 'u1',
        pickupLocation: { x: 0, y: 0 },
        dropLocation: { x: 2, y: 0 },
        requestedCarType: CarType.HATCHBACK,
      });

      expect(ride.driverId).toBe('d_near');
    });

    it('Requested Hatchback available - assigns Hatchback without upgrade', () => {
      driverService.registerDriver({ id: 'd1', name: 'Driver Hatch' });
      driverService.registerCab({
        id: 'c1',
        driverId: 'd1',
        carType: CarType.HATCHBACK,
        licensePlate: 'ABC-1',
        initialLocation: { x: 1, y: 0 },
      });

      const ride = rideService.bookRide({
        userId: 'u1',
        pickupLocation: { x: 0, y: 0 },
        dropLocation: { x: 2, y: 0 },
        requestedCarType: CarType.HATCHBACK,
      });

      expect(ride.isUpgraded).toBe(false);
      expect(ride.assignedCarType).toBe(CarType.HATCHBACK);
      expect(ride.billedCarType).toBe(CarType.HATCHBACK);
    });

    it('Hatchback unavailable → Sedan free upgrade', () => {
      driverService.registerDriver({ id: 'd1', name: 'Driver Sedan' });
      driverService.registerCab({
        id: 'c1',
        driverId: 'd1',
        carType: CarType.SEDAN,
        licensePlate: 'ABC-1',
        initialLocation: { x: 1, y: 0 },
      });

      const ride = rideService.bookRide({
        userId: 'u1',
        pickupLocation: { x: 0, y: 0 },
        dropLocation: { x: 2, y: 0 },
        requestedCarType: CarType.HATCHBACK,
      });

      expect(ride.isUpgraded).toBe(true);
      expect(ride.assignedCarType).toBe(CarType.SEDAN);
      expect(ride.billedCarType).toBe(CarType.HATCHBACK);
    });

    it('Hatchback unavailable + Sedan unavailable - throws error', () => {
      driverService.registerDriver({ id: 'd1', name: 'Driver SUV' });
      driverService.registerCab({
        id: 'c1',
        driverId: 'd1',
        carType: CarType.SUV,
        licensePlate: 'ABC-1',
        initialLocation: { x: 1, y: 0 },
      });

      expect(() =>
        rideService.bookRide({
          userId: 'u1',
          pickupLocation: { x: 0, y: 0 },
          dropLocation: { x: 2, y: 0 },
          requestedCarType: CarType.HATCHBACK,
        })
      ).toThrow('No drivers available within 5 km radius');
    });

    it('Sedan requested → Hatchback should not be assigned', () => {
      driverService.registerDriver({ id: 'd1', name: 'Driver Hatch' });
      driverService.registerCab({
        id: 'c1',
        driverId: 'd1',
        carType: CarType.HATCHBACK,
        licensePlate: 'ABC-1',
        initialLocation: { x: 1, y: 0 },
      });

      expect(() =>
        rideService.bookRide({
          userId: 'u1',
          pickupLocation: { x: 0, y: 0 },
          dropLocation: { x: 2, y: 0 },
          requestedCarType: CarType.SEDAN,
        })
      ).toThrow('No drivers available within 5 km radius');
    });

    it('All nearby drivers are already busy', () => {
      driverService.registerDriver({ id: 'd1', name: 'Driver 1' });
      driverService.registerCab({
        id: 'c1',
        driverId: 'd1',
        carType: CarType.HATCHBACK,
        licensePlate: 'ABC-1',
        initialLocation: { x: 1, y: 0 },
      });
      // Driver is BUSY / ON_TRIP
      driverRepo.updateDriverStatus('d1', DriverStatus.ON_TRIP);

      expect(() =>
        rideService.bookRide({
          userId: 'u1',
          pickupLocation: { x: 0, y: 0 },
          dropLocation: { x: 2, y: 0 },
          requestedCarType: CarType.HATCHBACK,
        })
      ).toThrow('No drivers currently available');
    });
  });

  // ==========================================
  // 4. Location Edge Cases
  // ==========================================
  describe('Location Edge Cases', () => {
    it('Invalid driver ID when updating location', () => {
      expect(() =>
        driverService.updateDriverLocationByDriverId('non_existent', { x: 1, y: 1 })
      ).toThrow('No cab found for driver non_existent');
    });

    it('Latitude < -90 or > 90 throws error', () => {
      expect(() => validateLocation({ x: 0, y: 0, latitude: -91, longitude: 0 })).toThrow('Invalid latitude');
      expect(() => validateLocation({ x: 0, y: 0, latitude: 91, longitude: 0 })).toThrow('Invalid latitude');
      expect(() => validateGeoCoordinates(95, 0)).toThrow('Invalid latitude');
    });

    it('Longitude < -180 or > 180 throws error', () => {
      expect(() => validateLocation({ x: 0, y: 0, latitude: 0, longitude: -181 })).toThrow('Invalid longitude');
      expect(() => validateLocation({ x: 0, y: 0, latitude: 0, longitude: 181 })).toThrow('Invalid longitude');
      expect(() => validateGeoCoordinates(0, 185)).toThrow('Invalid longitude');
    });

    it('Missing latitude/longitude in validateGeoCoordinates throws error', () => {
      expect(() => validateGeoCoordinates(undefined as unknown as number, 0)).toThrow('Missing latitude/longitude');
    });

    it('Driver location updated while on a ride', () => {
      userService.registerUser({ id: 'u1', name: 'User 1' });
      driverService.registerDriver({ id: 'd1', name: 'Driver 1' });
      driverService.registerCab({
        id: 'c1',
        driverId: 'd1',
        carType: CarType.HATCHBACK,
        licensePlate: 'ABC-1',
        initialLocation: { x: 0, y: 0 },
      });

      rideService.bookRide({
        userId: 'u1',
        pickupLocation: { x: 0, y: 0 },
        dropLocation: { x: 5, y: 0 },
        requestedCarType: CarType.HATCHBACK,
      });

      // Update location while driver is ON_TRIP
      const updated = driverService.updateDriverLocationByDriverId('d1', { x: 2.5, y: 0 });
      expect(updated).toBe(true);
      const cab = driverRepo.findCabById('c1');
      expect(cab?.currentLocation.x).toBe(2.5);
    });
  });

  // ==========================================
  // 5. Pricing Edge Cases
  // ==========================================
  describe('Pricing Edge Cases', () => {
    // Custom tier strategy matching 2km / 5km assignment boundaries:
    // Base min fare 50 (0-2 km @ 25/km), 2-5 km @ 12/km, >5 km @ 15/km
    const customPricing = new TieredPricingStrategy(50, [
      { name: 'First 2 km', minKm: 0, maxKm: 2, ratePerKm: 25 },
      { name: '2–5 km', minKm: 2, maxKm: 5, ratePerKm: 12 },
      { name: '5 km and beyond', minKm: 5, maxKm: Infinity, ratePerKm: 15 },
    ], {
      [CarType.HATCHBACK]: 1.0,
      [CarType.SEDAN]: 1.5,
    });
    customPricing.setCarMultiplier('SUV', 2.0);

    it('0 km applies minimum fare ₹50', () => {
      const fare = customPricing.calculateFare({ distanceKm: 0, billedCarType: CarType.HATCHBACK });
      expect(fare.finalFare).toBe(50);
      expect(fare.minimumFare).toBe(50);
      expect(fare.rawTieredFare).toBe(0);
    });

    it('Distance < 2 km applies minimum fare ₹50', () => {
      const fare = customPricing.calculateFare({ distanceKm: 1.5, billedCarType: CarType.HATCHBACK });
      expect(fare.finalFare).toBe(50);
      expect(fare.minimumFare).toBe(50);
    });

    it('Exactly 2 km costs ₹50', () => {
      const fare = customPricing.calculateFare({ distanceKm: 2.0, billedCarType: CarType.HATCHBACK });
      expect(fare.finalFare).toBe(50);
    });

    it('Just above 2 km (2.1 km)', () => {
      const fare = customPricing.calculateFare({ distanceKm: 2.1, billedCarType: CarType.HATCHBACK });
      // 50 + (0.1 * 12) = 51.2
      expect(fare.finalFare).toBe(51.2);
    });

    it('Distance between 2-5 km (3.5 km)', () => {
      const fare = customPricing.calculateFare({ distanceKm: 3.5, billedCarType: CarType.HATCHBACK });
      // 50 + (1.5 * 12) = 68.0
      expect(fare.finalFare).toBe(68.0);
    });

    it('Exactly 5 km costs ₹86', () => {
      const fare = customPricing.calculateFare({ distanceKm: 5.0, billedCarType: CarType.HATCHBACK });
      // 50 + (3.0 * 12) = 86.0
      expect(fare.finalFare).toBe(86.0);
    });

    it('Just above 5 km (5.1 km)', () => {
      const fare = customPricing.calculateFare({ distanceKm: 5.1, billedCarType: CarType.HATCHBACK });
      // 50 + 36 + (0.1 * 15) = 87.5
      expect(fare.finalFare).toBe(87.5);
    });

    it('Distance > 5 km (10 km)', () => {
      const fare = customPricing.calculateFare({ distanceKm: 10.0, billedCarType: CarType.HATCHBACK });
      // 50 + 36 + (5 * 15) = 161.0
      expect(fare.finalFare).toBe(161.0);
    });

    it('Very large distance (100 km)', () => {
      const fare = customPricing.calculateFare({ distanceKm: 100.0, billedCarType: CarType.HATCHBACK });
      // 50 + 36 + (95 * 15) = 1511.0
      expect(fare.finalFare).toBe(1511.0);
    });

    it('Minimum fare applied', () => {
      const fare = customPricing.calculateFare({ distanceKm: 0.5, billedCarType: CarType.HATCHBACK });
      expect(fare.finalFare).toBe(50);
    });

    it('Hatchback pricing (1.0x multiplier)', () => {
      const fare = customPricing.calculateFare({ distanceKm: 10, billedCarType: CarType.HATCHBACK });
      expect(fare.carTypeMultiplier).toBe(1.0);
      expect(fare.finalFare).toBe(161.0);
    });

    it('Sedan pricing (1.5x multiplier)', () => {
      const fare = customPricing.calculateFare({ distanceKm: 10, billedCarType: CarType.SEDAN });
      // 161 * 1.5 = 241.5
      expect(fare.carTypeMultiplier).toBe(1.5);
      expect(fare.finalFare).toBe(241.5);
    });

    it('Different car types produce correct rates (SUV 2.0x)', () => {
      const fare = customPricing.calculateFare({ distanceKm: 10, billedCarType: CarType.SUV });
      // 161 * 2.0 = 322.0
      expect(fare.carTypeMultiplier).toBe(2.0);
      expect(fare.finalFare).toBe(322.0);
    });
  });

  // ==========================================
  // 6. Coupon Edge Cases
  // ==========================================
  describe('Coupon Edge Cases', () => {
    it('No coupon - regular fare', () => {
      const fare = pricing.calculateFare({ distanceKm: 10, billedCarType: CarType.HATCHBACK });
      expect(fare.discountAmount).toBe(0);
      expect(fare.finalFare).toBe(69);
    });

    it('Valid coupon - flat discount', () => {
      const coupon = couponService.addCoupon({
        code: 'SAVE20',
        discountType: DiscountType.FLAT,
        discountValue: 20,
      });
      const fare = pricing.calculateFare({ distanceKm: 10, billedCarType: CarType.HATCHBACK, coupon });
      expect(fare.discountAmount).toBe(20);
      expect(fare.finalFare).toBe(49);
    });

    it('Invalid coupon - validation fails', () => {
      const res = couponService.validateCoupon('DOES_NOT_EXIST');
      expect(res.valid).toBe(false);
      expect(res.reason).toContain('not found');
    });

    it('Deleted coupon - cannot be used', () => {
      couponService.addCoupon({ code: 'DEL50', discountType: DiscountType.FLAT, discountValue: 50 });
      couponService.deleteCoupon('DEL50');
      const res = couponService.validateCoupon('DEL50');
      expect(res.valid).toBe(false);
      expect(res.reason).toContain('not found');
    });

    it('Inactive coupon - fails validation', () => {
      couponService.addCoupon({ code: 'OFFLINE', discountType: DiscountType.FLAT, discountValue: 10, isActive: false });
      const res = couponService.validateCoupon('OFFLINE');
      expect(res.valid).toBe(false);
      expect(res.reason).toContain('inactive');
    });

    it('0% discount - allowed and gives 0 discount', () => {
      const coupon = couponService.addCoupon({ code: 'ZERO', discountType: DiscountType.PERCENTAGE, discountValue: 0 });
      const fare = pricing.calculateFare({ distanceKm: 10, billedCarType: CarType.HATCHBACK, coupon });
      expect(fare.discountAmount).toBe(0);
      expect(fare.finalFare).toBe(69);
    });

    it('Negative discount - rejected on addCoupon', () => {
      expect(() =>
        couponService.addCoupon({ code: 'NEGATIVE', discountType: DiscountType.FLAT, discountValue: -10 })
      ).toThrow('Discount value cannot be negative or missing');
    });

    it('Discount > 100% for percentage - rejected on addCoupon', () => {
      expect(() =>
        couponService.addCoupon({ code: 'OVER100', discountType: DiscountType.PERCENTAGE, discountValue: 105 })
      ).toThrow('Discount percentage cannot exceed 100%');
    });

    it('Missing coupon code - rejected', () => {
      expect(() =>
        couponService.addCoupon({ code: '', discountType: DiscountType.FLAT, discountValue: 10 })
      ).toThrow('Coupon code is required');
    });

    it('Duplicate coupon code - rejected', () => {
      couponService.addCoupon({ code: 'DUP10', discountType: DiscountType.FLAT, discountValue: 10 });
      expect(() =>
        couponService.addCoupon({ code: 'DUP10', discountType: DiscountType.FLAT, discountValue: 10 })
      ).toThrow("Duplicate coupon code: 'DUP10' already exists");
    });
  });

  // ==========================================
  // 7. Ride Booking Edge Cases
  // ==========================================
  describe('Ride Booking Edge Cases', () => {
    beforeEach(() => {
      userService.registerUser({ id: 'u1', name: 'User 1' });
      driverService.registerDriver({ id: 'd1', name: 'Driver 1' });
      driverService.registerCab({
        id: 'c1',
        driverId: 'd1',
        carType: CarType.HATCHBACK,
        licensePlate: 'ABC-1',
        initialLocation: { x: 0, y: 0 },
      });
    });

    it('Invalid user - throws error', () => {
      expect(() =>
        rideService.bookRide({
          userId: 'u_fake',
          pickupLocation: { x: 0, y: 0 },
          dropLocation: { x: 2, y: 0 },
          requestedCarType: CarType.HATCHBACK,
        })
      ).toThrow('User u_fake does not exist');
    });

    it('Invalid pickup location - throws error', () => {
      expect(() =>
        rideService.bookRide({
          userId: 'u1',
          pickupLocation: { x: NaN, y: 0 },
          dropLocation: { x: 2, y: 0 },
          requestedCarType: CarType.HATCHBACK,
        })
      ).toThrow('Missing or invalid coordinates');
    });

    it('Invalid destination - throws error', () => {
      expect(() =>
        rideService.bookRide({
          userId: 'u1',
          pickupLocation: { x: 0, y: 0 },
          dropLocation: { x: 2, y: 0, latitude: 150 },
          requestedCarType: CarType.HATCHBACK,
        })
      ).toThrow('Invalid latitude');
    });

    it('Invalid car type - throws error', () => {
      expect(() =>
        rideService.bookRide({
          userId: 'u1',
          pickupLocation: { x: 0, y: 0 },
          dropLocation: { x: 2, y: 0 },
          requestedCarType: 'BOAT' as unknown as CarType,
        })
      ).toThrow('Invalid or missing requested car type');
    });

    it('Pickup = destination - valid booking with 0 km ride', () => {
      const ride = rideService.bookRide({
        userId: 'u1',
        pickupLocation: { x: 1, y: 1 },
        dropLocation: { x: 1, y: 1 },
        requestedCarType: CarType.HATCHBACK,
      });

      expect(ride.status).toBe(RideStatus.REQUESTED);
      const completed = rideService.endRide(ride.id);
      expect(completed.distanceKm).toBe(0);
      expect(completed.fareBreakdown?.finalFare).toBe(50);
    });

    it('Valid booking changes driver status AVAILABLE → ON_TRIP', () => {
      const ride = rideService.bookRide({
        userId: 'u1',
        pickupLocation: { x: 0, y: 0 },
        dropLocation: { x: 2, y: 0 },
        requestedCarType: CarType.HATCHBACK,
      });

      expect(ride.status).toBe(RideStatus.REQUESTED);
      const driver = driverService.getDriver('d1');
      expect(driver.status).toBe(DriverStatus.ON_TRIP);
    });
  });

  // ==========================================
  // 8. Ride Completion Edge Cases
  // ==========================================
  describe('Ride Completion Edge Cases', () => {
    let activeRideId: string;

    beforeEach(() => {
      userService.registerUser({ id: 'u1', name: 'User 1' });
      driverService.registerDriver({ id: 'd1', name: 'Driver 1' });
      driverService.registerCab({
        id: 'c1',
        driverId: 'd1',
        carType: CarType.HATCHBACK,
        licensePlate: 'ABC-1',
        initialLocation: { x: 0, y: 0 },
      });
      const ride = rideService.bookRide({
        userId: 'u1',
        pickupLocation: { x: 0, y: 0 },
        dropLocation: { x: 10, y: 0 },
        requestedCarType: CarType.HATCHBACK,
      });
      activeRideId = ride.id;
    });

    it('Ride does not exist - throws error', () => {
      expect(() => rideService.endRide('fake_ride_id')).toThrow('Ride fake_ride_id not found');
    });

    it('Ride already completed - throws error', () => {
      rideService.endRide(activeRideId);
      expect(() => rideService.endRide(activeRideId)).toThrow('Cannot end ride with status COMPLETED');
    });

    it('Ride already cancelled - throws error', () => {
      rideService.cancelRide(activeRideId);
      expect(() => rideService.endRide(activeRideId)).toThrow('Cannot end ride with status CANCELLED');
    });

    it('Invalid destination when ending ride - throws error', () => {
      expect(() => rideService.endRide(activeRideId, { x: 10, y: 0, latitude: 120 })).toThrow('Invalid latitude');
    });

    it('Driver changes ON_TRIP → AVAILABLE on ride completion', () => {
      expect(driverService.getDriver('d1').status).toBe(DriverStatus.ON_TRIP);
      const completed = rideService.endRide(activeRideId);
      expect(completed.status).toBe(RideStatus.COMPLETED);
      expect(driverService.getDriver('d1').status).toBe(DriverStatus.AVAILABLE);
      // Cab location updated to drop point
      const cab = driverRepo.findCabById('c1');
      expect(cab?.currentLocation.x).toBe(10);
    });

    it('Correct final distance & fare & coupon usage incremented', () => {
      userService.registerUser({ id: 'u2', name: 'User 2' });
      driverService.registerDriver({ id: 'd2', name: 'Driver 2' });
      driverService.registerCab({
        id: 'c2',
        driverId: 'd2',
        carType: CarType.HATCHBACK,
        licensePlate: 'ABC-2',
        initialLocation: { x: 0, y: 0 },
      });
      couponService.addCoupon({ code: 'SAVE10', discountType: DiscountType.FLAT, discountValue: 10 });

      const ride = rideService.bookRide({
        userId: 'u2',
        pickupLocation: { x: 0, y: 0 },
        dropLocation: { x: 5, y: 0 },
        requestedCarType: CarType.HATCHBACK,
        couponCode: 'SAVE10',
      });

      const finished = rideService.endRide(ride.id);
      expect(finished.distanceKm).toBe(5.0);
      expect(finished.fareBreakdown?.finalFare).toBe(40.0); // min fare 50 - 10 = 40
      const coupon = couponService.getCoupon('SAVE10');
      expect(coupon?.usedCount).toBe(1);
    });
  });

  // ==========================================
  // 9. Ride History Edge Cases
  // ==========================================
  describe('Ride History Edge Cases', () => {
    beforeEach(() => {
      userService.registerUser({ id: 'u1', name: 'User 1' });
      driverService.registerDriver({ id: 'd1', name: 'Driver 1' });
      driverService.registerCab({
        id: 'c1',
        driverId: 'd1',
        carType: CarType.HATCHBACK,
        licensePlate: 'ABC-1',
        initialLocation: { x: 0, y: 0 },
      });
    });

    it('User has no rides initially', () => {
      const history = userService.getUserRideHistory('u1');
      expect(history.all.length).toBe(0);
      expect(history.ongoing.length).toBe(0);
      expect(history.completed.length).toBe(0);
    });

    it('Driver has no rides initially', () => {
      const history = driverService.getDriverRideHistory('d1');
      expect(history.all.length).toBe(0);
      expect(history.ongoing.length).toBe(0);
      expect(history.completed.length).toBe(0);
    });

    it('User and Driver reflect ongoing and completed rides accurately', () => {
      const ride = rideService.bookRide({
        userId: 'u1',
        pickupLocation: { x: 0, y: 0 },
        dropLocation: { x: 3, y: 0 },
        requestedCarType: CarType.HATCHBACK,
      });

      let uHistory = userService.getUserRideHistory('u1');
      let dHistory = driverService.getDriverRideHistory('d1');
      expect(uHistory.ongoing.length).toBe(1);
      expect(uHistory.completed.length).toBe(0);
      expect(dHistory.ongoing.length).toBe(1);
      expect(dHistory.completed.length).toBe(0);

      rideService.endRide(ride.id);

      uHistory = userService.getUserRideHistory('u1');
      dHistory = driverService.getDriverRideHistory('d1');
      expect(uHistory.ongoing.length).toBe(0);
      expect(uHistory.completed.length).toBe(1);
      expect(dHistory.ongoing.length).toBe(0);
      expect(dHistory.completed.length).toBe(1);
    });

    it('Invalid user ID throws error in ride history', () => {
      expect(() => userService.getUserRideHistory('fake_u')).toThrow('User fake_u not found');
    });

    it('Invalid driver ID throws error in ride history', () => {
      expect(() => driverService.getDriverRideHistory('fake_d')).toThrow('Driver fake_d not found');
    });
  });

  // ==========================================
  // 10. Concurrency / Bonus Edge Cases
  // ==========================================
  describe('Concurrency Edge Cases', () => {
    it('Concurrent booking: Driver cannot be assigned to two rides & state remains consistent', async () => {
      userService.registerUser({ id: 'u1', name: 'User 1' });
      userService.registerUser({ id: 'u2', name: 'User 2' });
      driverService.registerDriver({ id: 'd1', name: 'Driver 1' });
      driverService.registerCab({
        id: 'c1',
        driverId: 'd1',
        carType: CarType.HATCHBACK,
        licensePlate: 'ABC-1',
        initialLocation: { x: 0, y: 0 },
      });

      // Simulate simultaneous booking attempts for the same single driver
      const promises = [
        Promise.resolve().then(() =>
          rideService.bookRide({
            userId: 'u1',
            pickupLocation: { x: 0, y: 0 },
            dropLocation: { x: 3, y: 0 },
            requestedCarType: CarType.HATCHBACK,
          })
        ),
        Promise.resolve().then(() =>
          rideService.bookRide({
            userId: 'u2',
            pickupLocation: { x: 0, y: 0 },
            dropLocation: { x: 4, y: 0 },
            requestedCarType: CarType.HATCHBACK,
          })
        ),
      ];

      const results = await Promise.allSettled(promises);
      const fulfilled = results.filter(r => r.status === 'fulfilled');
      const rejected = results.filter(r => r.status === 'rejected');

      // Exactly one booking succeeds, one fails
      expect(fulfilled.length).toBe(1);
      expect(rejected.length).toBe(1);

      // Driver state remains consistent
      const driver = driverService.getDriver('d1');
      expect(driver.status).toBe(DriverStatus.ON_TRIP);
      const activeDriverRides = rideRepo.findOngoingRidesByDriverId('d1');
      expect(activeDriverRides.length).toBe(1);
    });
  });
});
