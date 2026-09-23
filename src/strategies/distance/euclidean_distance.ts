import { Location } from '../../models/modelsIndex.js';
import { DistanceStrategy } from './distance_strategy.js';

/**
 * Calculates Euclidean distance (straight-line distance):
 * sqrt((x2 - x1)^2 + (y2 - y1)^2) rounded to 2 decimal places.
 */
export class EuclideanDistanceStrategy implements DistanceStrategy {
  public readonly strategyName = 'EUCLIDEAN';

  public calculate(a: Location, b: Location): number {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return Math.round(Math.sqrt(dx * dx + dy * dy) * 100) / 100;
  }
}
