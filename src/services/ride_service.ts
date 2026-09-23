import {
  Ride, RideStatus, CarType, Location, calculateDistance, DriverStatus,
} from '../models/index.js';
import {
  UserRepository, DriverRepository, RideRepository, CouponRepository,
} from '../db/index.js';
import {
  PricingStrategy, TieredPricingStrategy,
  DriverMatchingStrategy, NearestDriverMatchingStrategy,
} from '../strategies/index.js';
import { CouponService } from './coupon_service.js';

export interface BookRideDto {
  userId: string;
  pickupLocation: Location;
  dropLocation: Location;
  requestedCarType: CarType;
  maxRadiusKm?: number;
  couponCode?: string;
  surgeMultiplier?: number;
}

export class RideService {
  private userRepo: UserRepository;
  private driverRepo: DriverRepository;
  private rideRepo: RideRepository;
  private couponRepo: CouponRepository;
  private couponService: CouponService;
  private pricingStrategy: PricingStrategy;
  private matchingStrategy: DriverMatchingStrategy;
  private defaultMaxRadiusKm = 5.0;

  constructor(
    userRepo = new UserRepository(),
    driverRepo = new DriverRepository(),
    rideRepo = new RideRepository(),
    couponRepo = new CouponRepository(),
    pricingStrategy: PricingStrategy = new TieredPricingStrategy(),
    matchingStrategy: DriverMatchingStrategy = new NearestDriverMatchingStrategy()
  ) {
    this.userRepo = userRepo;
    this.driverRepo = driverRepo;
    this.rideRepo = rideRepo;
    this.couponRepo = couponRepo;
    this.couponService = new CouponService(couponRepo);
    this.pricingStrategy = pricingStrategy;
    this.matchingStrategy = matchingStrategy;
  }

  /** Switch matching strategy at runtime (Strategy Pattern). */
  public setMatchingStrategy(strategy: DriverMatchingStrategy): void {
    this.matchingStrategy = strategy;
  }

  public getMatchingStrategy(): DriverMatchingStrategy {
    return this.matchingStrategy;
  }

  public setPricingStrategy(strategy: PricingStrategy): void {
    this.pricingStrategy = strategy;
  }

  public bookRide(dto: BookRideDto): Ride {
    // 1. Verify user
    const user = this.userRepo.findById(dto.userId);
    if (!user) throw new Error(`User ${dto.userId} does not exist`);

    // 2. Validate coupon if provided
    let validCoupon = undefined;
    if (dto.couponCode) {
      const result = this.couponService.validateCoupon(dto.couponCode);
      if (!result.valid) throw new Error(`Coupon error: ${result.reason}`);
      validCoupon = result.coupon;
    }

    const radius = dto.maxRadiusKm ?? this.defaultMaxRadiusKm;

    // 3. Get available driver pool from DB
    const available = this.driverRepo.findAvailableDriversWithCabs();
    if (available.length === 0) throw new Error('No drivers currently available');

    // 4. Run matching strategy (handles free upgrade logic internally)
    const match = this.matchingStrategy.findMatch(available, dto.pickupLocation, radius, dto.requestedCarType);
    if (!match) throw new Error(`No drivers available within ${radius} km radius for requested car type`);

    // 5. Acquire atomic lock to prevent double-booking
    const locked = this.driverRepo.acquireDriverLock(match.driver.id);
    if (!locked) throw new Error(`Driver ${match.driver.id} is being booked by another rider. Please retry.`);

    try {
      // Re-verify driver is still available after acquiring lock
      const current = this.driverRepo.findDriverById(match.driver.id);
      if (!current || current.status !== DriverStatus.AVAILABLE) {
        throw new Error(`Driver ${match.driver.id} is no longer available`);
      }

      // Mark driver ON_TRIP
      this.driverRepo.updateDriverStatus(match.driver.id, DriverStatus.ON_TRIP);

      const ride: Ride = {
        id: `ride_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        userId: dto.userId,
        driverId: match.driver.id,
        cabId: match.cab.id,
        requestedCarType: match.requestedCarType,
        billedCarType: match.billedCarType,
        assignedCarType: match.assignedCarType,
        isUpgraded: match.isUpgraded,
        pickupLocation: { ...dto.pickupLocation },
        dropLocation: { ...dto.dropLocation },
        status: RideStatus.REQUESTED,
        couponCode: validCoupon?.code,
        bookedAt: new Date(),
      };

      return this.rideRepo.save(ride);
    } finally {
      this.driverRepo.releaseDriverLock(match.driver.id);
    }
  }

  public startRide(rideId: string): Ride {
    const ride = this.rideRepo.findById(rideId);
    if (!ride) throw new Error(`Ride ${rideId} not found`);
    if (ride.status !== RideStatus.REQUESTED) throw new Error(`Cannot start ride with status ${ride.status}`);

    ride.status = RideStatus.ONGOING;
    ride.startedAt = new Date();
    return this.rideRepo.update(ride);
  }

  public endRide(rideId: string, actualEndLocation?: Location): Ride {
    const ride = this.rideRepo.findById(rideId);
    if (!ride) throw new Error(`Ride ${rideId} not found`);
    if (ride.status !== RideStatus.ONGOING && ride.status !== RideStatus.REQUESTED) {
      throw new Error(`Cannot end ride with status ${ride.status}`);
    }

    const drop = actualEndLocation ?? { ...ride.dropLocation };
    const distanceKm = calculateDistance(ride.pickupLocation, drop);

    // Retrieve coupon if used
    const coupon = ride.couponCode ? this.couponRepo.findByCode(ride.couponCode) ?? undefined : undefined;

    // Calculate fare
    const fareBreakdown = this.pricingStrategy.calculateFare({
      distanceKm,
      billedCarType: ride.billedCarType,
      assignedCarType: ride.assignedCarType,
      isUpgraded: ride.isUpgraded,
      coupon,
    });

    // Increment coupon usage
    if (ride.couponCode) this.couponRepo.incrementUsage(ride.couponCode);

    // Free driver and update cab location to drop point
    this.driverRepo.updateDriverStatus(ride.driverId, DriverStatus.AVAILABLE);
    this.driverRepo.updateCabLocation(ride.cabId, drop);

    ride.status = RideStatus.COMPLETED;
    ride.actualEndLocation = drop;
    ride.distanceKm = distanceKm;
    ride.fareBreakdown = fareBreakdown;
    ride.completedAt = new Date();

    return this.rideRepo.update(ride);
  }

  /** Cancel ride. Fee: ₹0 if REQUESTED, ₹30 if ONGOING. */
  public cancelRide(rideId: string, reason?: string): Ride {
    const ride = this.rideRepo.findById(rideId);
    if (!ride) throw new Error(`Ride ${rideId} not found`);
    if (ride.status === RideStatus.COMPLETED || ride.status === RideStatus.CANCELLED) {
      throw new Error(`Ride is already ${ride.status}`);
    }

    const fee = ride.status === RideStatus.ONGOING ? 30 : 0;

    this.driverRepo.updateDriverStatus(ride.driverId, DriverStatus.AVAILABLE);

    ride.status = RideStatus.CANCELLED;
    ride.cancelledAt = new Date();
    ride.cancellationReason = reason || 'User cancelled ride';
    ride.cancellationFee = fee;

    return this.rideRepo.update(ride);
  }

  public getRide(rideId: string): Ride {
    const ride = this.rideRepo.findById(rideId);
    if (!ride) throw new Error(`Ride ${rideId} not found`);
    return ride;
  }
}
