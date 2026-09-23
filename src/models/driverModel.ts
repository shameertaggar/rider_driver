import { Cab } from './cabModel.js';

export enum DriverStatus {
  AVAILABLE = 'AVAILABLE',
  ON_TRIP = 'ON_TRIP',
  OFFLINE = 'OFFLINE',
}

export interface Driver {
  id: string;
  name: string;
  rating: number;
  status: DriverStatus;
  cab?: Cab;
  createdAt: Date;
}
