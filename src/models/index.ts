// ─── Location Model ───
export interface Location {
  x: number;
  y: number;
}

/** Euclidean distance between two 2D points, rounded to 2 decimal places. */
export function calculateDistance(a: Location, b: Location): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.round(Math.sqrt(dx * dx + dy * dy) * 100) / 100;
}

// ─── Car Type ───
export enum CarType {
  HATCHBACK = 'HATCHBACK',
  SEDAN = 'SEDAN',
  // Extensible: add SUV = 'SUV' here
}

export const CAR_TYPE_MULTIPLIERS: Record<CarType, number> = {
  [CarType.HATCHBACK]: 1.0,
  [CarType.SEDAN]: 1.2,
};

// ─── User Model ───
export interface User {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  createdAt: Date;
}

// ─── Driver & Cab Models ───
export enum DriverStatus {
  AVAILABLE = 'AVAILABLE',
  ON_TRIP = 'ON_TRIP',
  OFFLINE = 'OFFLINE',
}

export interface Cab {
  id: string;
  driverId: string;
  carType: CarType;
  licensePlate: string;
  currentLocation: Location;
}

export interface Driver {
  id: string;
  name: string;
  rating: number;
  status: DriverStatus;
  cab?: Cab;
  createdAt: Date;
}

// ─── Coupon Model ───
export enum DiscountType {
  PERCENTAGE = 'PERCENTAGE',
  FLAT = 'FLAT',
}

export interface Coupon {
  code: string;
  discountType: DiscountType;
  discountValue: number;
  maxDiscount?: number;
  minRideFare?: number;
  expiryDate?: Date;
  usageLimit?: number;
  usedCount: number;
  isActive: boolean;
}

// ─── Ride Model ───
export enum RideStatus {
  REQUESTED = 'REQUESTED',
  ONGOING = 'ONGOING',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export interface TierDetail {
  tierName: string;
  distanceKm: number;
  ratePerKm: number;
  subtotal: number;
}

export interface FareBreakdown {
  distanceKm: number;
  tieredBreakdown: TierDetail[];
  rawTieredFare: number;
  carTypeMultiplier: number;
  fareAfterCarMultiplier: number;
  surgeMultiplier: number;
  fareAfterSurge: number;
  minimumFare: number;
  fareBeforeDiscount: number;
  discountAmount: number;
  finalFare: number;
  couponCode?: string;
  isUpgraded: boolean;
  requestedCarType: CarType;
  billedCarType: CarType;
  assignedCarType: CarType;
}

export interface Ride {
  id: string;
  userId: string;
  driverId: string;
  cabId: string;
  requestedCarType: CarType;
  billedCarType: CarType;
  assignedCarType: CarType;
  isUpgraded: boolean;
  pickupLocation: Location;
  dropLocation: Location;
  actualEndLocation?: Location;
  distanceKm?: number;
  status: RideStatus;
  fareBreakdown?: FareBreakdown;
  couponCode?: string;
  bookedAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  cancelledAt?: Date;
  cancellationFee?: number;
  cancellationReason?: string;
  distanceStrategy?: string;
}
