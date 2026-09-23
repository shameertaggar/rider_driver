import {
  Ride, RideStatus, CarType, Location, DriverStatus,
} from '../models/index.js';
import {
  UserRepository, DriverRepository, RideRepository, CouponRepository,
} from '../db/index.js';
import {
  PricingStrategy, TieredPricingStrategy,
  DriverMatchingStrategy, NearestDriverMatchingStrategy,
  DistanceStrategy, EuclideanDistanceStrategy, ManhattanDistanceStrategy,
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
  distanceStrategy?: 'EUCLIDEAN' | 'MANHATTAN';
}

export class RideService {
  private userRepo: UserRepository;
  private driverRepo: DriverRepository;
  private rideRepo: RideRepository;
  private couponRepo: CouponRepository;
  private couponService: CouponService;
  private pricingStrategy: PricingStrategy;
  private matchingStrategy: DriverMatchingStrategy;
  private distanceStrategy: DistanceStrategy;
  private defaultMaxRadiusKm = 5.0;

  constructor(
    userRepo = new UserRepository(),
    driverRepo = new DriverRepository(),
    rideRepo = new RideRepository(),
    couponRepo = new CouponRepository(),
    pricingStrategy: PricingStrategy = new TieredPricingStrategy(),
    matchingStrategy: DriverMatchingStrategy = new NearestDriverMatchingStrategy(),
    distanceStrategy: DistanceStrategy = new EuclideanDistanceStrategy()
  ) {
    this.userRepo = userRepo;
    this.driverRepo = driverRepo;
    this.rideRepo = rideRepo;
    this.couponRepo = couponRepo;
    this.couponService = new CouponService(couponRepo);
    this.pricingStrategy = pricingStrategy;
    this.matchingStrategy = matchingStrategy;
    this.distanceStrategy = distanceStrategy;
  }

  /** Switch matching strategy at runtime (Strategy Pattern). */
  public setMatchingStrategy(strategy: DriverMatchingStrategy): void {
    this.matchingStrategy = strategy;
    if (this.matchingStrategy.setDistanceStrategy) {
      this.matchingStrategy.setDistanceStrategy(this.distanceStrategy);
    }
  }

  public getMatchingStrategy(): DriverMatchingStrategy {
    return this.matchingStrategy;
  }

  /** Switch distance calculation strategy at runtime (Strategy Pattern). */
  public setDistanceStrategy(strategy: DistanceStrategy): void {
    this.distanceStrategy = strategy;
    if (this.matchingStrategy.setDistanceStrategy) {
      this.matchingStrategy.setDistanceStrategy(strategy);
    }
  }

  public getDistanceStrategy(): DistanceStrategy {
    return this.distanceStrategy;
  }

  public calculateDistance(from: Location, to: Location, strategyType?: string): { distanceKm: number; strategy: string; strategyName: string } {
    let strategy: DistanceStrategy = this.distanceStrategy;
    if (strategyType === 'MANHATTAN') {
      strategy = new ManhattanDistanceStrategy();
    } else if (strategyType === 'EUCLIDEAN') {
      strategy = new EuclideanDistanceStrategy();
    }
    const distanceKm = strategy.calculate(from, to);
    return {
      distanceKm,
      strategy: strategy.strategyName,
      strategyName: strategy instanceof ManhattanDistanceStrategy ? 'Manhattan Distance Strategy' : 'Euclidean Distance Strategy',
    };
  }

  public setPricingStrategy(strategy: PricingStrategy): void {
    this.pricingStrategy = strategy;
  }

  public bookRide(dto: BookRideDto): Ride {
    // 1. Verify user
    const user = this.userRepo.findById(dto.userId);
    if (!user) throw new Error(`User ${dto.userId} does not exist`);

    // 2. Prevent booking if rider already has an active ride (REQUESTED or ONGOING)
    const activeRides = this.rideRepo.findOngoingRidesByUserId(dto.userId);
    if (activeRides.length > 0) {
      const active = activeRides[0];
      throw new Error(`Rider ${dto.userId} already has an active ride (${active.id}) with status '${active.status}'. Complete or cancel it before booking a new ride.`);
    }

    // 3. Validate coupon if provided
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
        distanceStrategy: dto.distanceStrategy ?? this.distanceStrategy.strategyName,
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
    const distCalc: DistanceStrategy = ride.distanceStrategy === 'MANHATTAN'
      ? new ManhattanDistanceStrategy()
      : (ride.distanceStrategy === 'EUCLIDEAN' ? new EuclideanDistanceStrategy() : this.distanceStrategy);
    const distanceKm = distCalc.calculate(ride.pickupLocation, drop);

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
