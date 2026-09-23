export enum CarType {
  HATCHBACK = 'HATCHBACK',
  SEDAN = 'SEDAN',
  // Extensible: add SUV = 'SUV' here
}

export const CAR_TYPE_MULTIPLIERS: Record<CarType, number> = {
  [CarType.HATCHBACK]: 1.0,
  [CarType.SEDAN]: 1.2,
};
