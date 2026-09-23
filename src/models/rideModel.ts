import { Location } from './locationModel.js';
import { CarType } from './carModel.js';

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
