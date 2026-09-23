import { Location } from './location.js';
import { CarType } from './car_type.js';

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
  rating: number; // e.g. 1.0 to 5.0
  status: DriverStatus;
  cab?: Cab;
  createdAt: Date;
}
