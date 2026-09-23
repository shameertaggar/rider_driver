import { describe, it, expect } from 'vitest';
import { NearestDriverMatchingStrategy } from '../src/strategies/matching/nearest_driver.js';
import { HighestRatedDriverMatchingStrategy } from '../src/strategies/matching/rating_driver.js';
import { Driver, Cab, DriverStatus, CarType } from '../src/models/index.js';

// Test data
const d1: Driver = { id: 'd1', name: 'Alice', rating: 4.5, status: DriverStatus.AVAILABLE, createdAt: new Date() };
const c1: Cab = { id: 'c1', driverId: 'd1', carType: CarType.HATCHBACK, licensePlate: 'KA-01-1111', currentLocation: { x: 2, y: 0 } };

const d2: Driver = { id: 'd2', name: 'Bob', rating: 4.9, status: DriverStatus.AVAILABLE, createdAt: new Date() };
const c2: Cab = { id: 'c2', driverId: 'd2', carType: CarType.HATCHBACK, licensePlate: 'KA-01-2222', currentLocation: { x: 4, y: 0 } };

const d3: Driver = { id: 'd3', name: 'Charlie', rating: 4.8, status: DriverStatus.AVAILABLE, createdAt: new Date() };
const c3: Cab = { id: 'c3', driverId: 'd3', carType: CarType.SEDAN, licensePlate: 'KA-01-3333', currentLocation: { x: 3, y: 0 } };

const dFar: Driver = { id: 'd4', name: 'Far', rating: 5.0, status: DriverStatus.AVAILABLE, createdAt: new Date() };
const cFar: Cab = { id: 'c4', driverId: 'd4', carType: CarType.HATCHBACK, licensePlate: 'KA-01-4444', currentLocation: { x: 15, y: 0 } };

const pool = [
  { driver: d1, cab: c1 }, { driver: d2, cab: c2 },
  { driver: d3, cab: c3 }, { driver: dFar, cab: cFar },
];

describe('NearestDriverMatchingStrategy', () => {
  const strategy = new NearestDriverMatchingStrategy();

  it('selects nearest Hatchback within radius', () => {
    const match = strategy.findMatch(pool, { x: 0, y: 0 }, 5, CarType.HATCHBACK);
    expect(match).not.toBeNull();
    expect(match!.driver.id).toBe('d1'); // 2 km away
    expect(match!.isUpgraded).toBe(false);
  });

  it('returns null when no drivers within radius', () => {
    const match = strategy.findMatch(pool, { x: 0, y: 0 }, 1, CarType.HATCHBACK);
    expect(match).toBeNull();
  });

  it('upgrades to Sedan when no Hatchback available in radius', () => {
    const sedanOnly = [{ driver: d3, cab: c3 }, { driver: dFar, cab: cFar }];
    const match = strategy.findMatch(sedanOnly, { x: 0, y: 0 }, 5, CarType.HATCHBACK);

    expect(match).not.toBeNull();
    expect(match!.isUpgraded).toBe(true);
    expect(match!.assignedCarType).toBe(CarType.SEDAN);
    expect(match!.billedCarType).toBe(CarType.HATCHBACK); // Hatchback rate!
  });
});

describe('HighestRatedDriverMatchingStrategy', () => {
  const strategy = new HighestRatedDriverMatchingStrategy();

  it('selects highest-rated driver over closer driver', () => {
    const match = strategy.findMatch(pool, { x: 0, y: 0 }, 5, CarType.HATCHBACK);
    expect(match).not.toBeNull();
    expect(match!.driver.id).toBe('d2'); // Bob: 4.9 rating
    expect(match!.driver.rating).toBe(4.9);
  });
});
