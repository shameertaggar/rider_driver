import { describe, it, expect } from 'vitest';
import {
  EuclideanDistanceStrategy,
  ManhattanDistanceStrategy,
} from '../src/strategies/distance/distanceIndex.js';
import { Location } from '../src/models/modelsIndex.js';

describe('Distance Calculation Strategies', () => {
  const p1: Location = { x: 0, y: 0 };
  const p2: Location = { x: 3, y: 4 };
  const p3: Location = { x: 6, y: 8 };

  describe('EuclideanDistanceStrategy', () => {
    const euclidean = new EuclideanDistanceStrategy();

    it('calculates 3-4-5 right triangle distance as 5.0 km', () => {
      expect(euclidean.calculate(p1, p2)).toBe(5);
    });

    it('calculates 6-8-10 distance as 10.0 km', () => {
      expect(euclidean.calculate(p1, p3)).toBe(10);
    });

    it('returns 0 for identical locations', () => {
      expect(euclidean.calculate(p1, p1)).toBe(0);
    });

    it('has strategyName EUCLIDEAN', () => {
      expect(euclidean.strategyName).toBe('EUCLIDEAN');
    });
  });

  describe('ManhattanDistanceStrategy', () => {
    const manhattan = new ManhattanDistanceStrategy();

    it('calculates grid distance for (0,0) to (3,4) as 7.0 km', () => {
      // |3 - 0| + |4 - 0| = 3 + 4 = 7
      expect(manhattan.calculate(p1, p2)).toBe(7);
    });

    it('calculates grid distance for (0,0) to (6,8) as 14.0 km', () => {
      // |6 - 0| + |8 - 0| = 6 + 8 = 14
      expect(manhattan.calculate(p1, p3)).toBe(14);
    });

    it('returns 0 for identical locations', () => {
      expect(manhattan.calculate(p1, p1)).toBe(0);
    });

    it('has strategyName MANHATTAN', () => {
      expect(manhattan.strategyName).toBe('MANHATTAN');
    });
  });
});
