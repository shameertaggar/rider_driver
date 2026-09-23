import { Location } from '../../models/modelsIndex.js';

export interface DistanceStrategy {
  readonly strategyName: string;
  calculate(a: Location, b: Location): number;
}
