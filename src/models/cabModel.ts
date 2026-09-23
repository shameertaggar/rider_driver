import { Location } from './locationModel.js';
import { CarType } from './carModel.js';

export interface Cab {
  id: string;
  driverId: string;
  carType: CarType;
  licensePlate: string;
  currentLocation: Location;
}
