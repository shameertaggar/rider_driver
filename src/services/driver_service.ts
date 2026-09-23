import { Driver, Cab, DriverStatus, CarType, Location, Ride, validateLocation } from '../models/modelsIndex.js';
import { DriverRepository, RideRepository } from '../db/dbIndex.js';

export interface RegisterDriverDto {
  id: string;
  name: string;
  rating?: number;
}

export interface RegisterCabDto {
  id: string;
  driverId: string;
  carType: CarType;
  licensePlate: string;
  initialLocation: Location;
}

export class DriverService {
  private driverRepo: DriverRepository;
  private rideRepo: RideRepository;

  constructor(driverRepo = new DriverRepository(), rideRepo = new RideRepository()) {
    this.driverRepo = driverRepo;
    this.rideRepo = rideRepo;
  }

  public registerDriver(dto: RegisterDriverDto): Driver {
    if (!dto.id?.trim() || !dto.name?.trim()) throw new Error('Driver ID and Name are required');
    if (this.driverRepo.findDriverById(dto.id.trim())) throw new Error(`Driver ${dto.id} already exists`);

    const driver: Driver = {
      id: dto.id.trim(),
      name: dto.name.trim(),
      rating: dto.rating ?? 5.0,
      status: DriverStatus.AVAILABLE,
      createdAt: new Date(),
    };
    return this.driverRepo.saveDriver(driver);
  }

  public registerCab(dto: RegisterCabDto): Cab {
    if (!dto.carType || !Object.values(CarType).includes(dto.carType)) {
      throw new Error(`Invalid or missing car type: ${dto.carType}`);
    }
    if (!this.driverRepo.findDriverById(dto.driverId)) {
      throw new Error(`Driver ${dto.driverId} not found`);
    }
    validateLocation(dto.initialLocation);

    const cab: Cab = {
      id: dto.id,
      driverId: dto.driverId,
      carType: dto.carType,
      licensePlate: dto.licensePlate,
      currentLocation: { ...dto.initialLocation },
    };
    return this.driverRepo.saveCab(cab);
  }

  public updateCabLocation(cabId: string, location: Location): boolean {
    validateLocation(location);
    if (!this.driverRepo.findCabById(cabId)) throw new Error(`Cab ${cabId} not found`);
    return this.driverRepo.updateCabLocation(cabId, location);
  }

  public updateDriverLocationByDriverId(driverId: string, location: Location): boolean {
    validateLocation(location);
    const cab = this.driverRepo.findCabByDriverId(driverId);
    if (!cab) throw new Error(`No cab found for driver ${driverId}`);
    return this.driverRepo.updateCabLocation(cab.id, location);
  }

  public updateDriverStatus(driverId: string, status: DriverStatus): boolean {
    if (status === DriverStatus.AVAILABLE) {
      const activeRides = this.rideRepo.findOngoingRidesByDriverId(driverId);
      if (activeRides.length > 0) {
        throw new Error(
          `Driver ${driverId} has an active ride (${activeRides[0].id}). The current ride must be cancelled or completed before becoming available.`
        );
      }
    }
    return this.driverRepo.updateDriverStatus(driverId, status);
  }

  public getDriver(driverId: string): Driver {
    const d = this.driverRepo.findDriverById(driverId);
    if (!d) throw new Error(`Driver ${driverId} not found`);
    return d;
  }

  public getAllDrivers(): Driver[] {
    return this.driverRepo.findAllDrivers();
  }

  public getDriverRideHistory(driverId: string): { ongoing: Ride[]; completed: Ride[]; all: Ride[] } {
    this.getDriver(driverId);
    return {
      ongoing: this.rideRepo.findOngoingRidesByDriverId(driverId),
      completed: this.rideRepo.findCompletedRidesByDriverId(driverId),
      all: this.rideRepo.findByDriverId(driverId),
    };
  }
}
