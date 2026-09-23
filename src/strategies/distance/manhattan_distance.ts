import { Location } from '../../models/modelsIndex.js';
import { DistanceStrategy } from './distance_strategy.js';

/**
 * Calculates Manhattan distance (taxicab / grid distance):
 * |x2 - x1| + |y2 - y1| rounded to 2 decimal places.
 */
export class ManhattanDistanceStrategy implements DistanceStrategy {
  public readonly strategyName = 'MANHATTAN';

  public calculate(a: Location, b: Location): number {
    const dx = Math.abs(a.x - b.x);
    const dy = Math.abs(a.y - b.y);
    return Math.round((dx + dy) * 100) / 100;
  }
}
