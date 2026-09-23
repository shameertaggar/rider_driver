import { Location } from '../../models/index.js';

export interface DistanceStrategy {
  readonly strategyName: string;
  calculate(a: Location, b: Location): number;
}
