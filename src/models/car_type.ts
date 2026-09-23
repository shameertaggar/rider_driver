export enum CarType {
  HATCHBACK = 'HATCHBACK',
  SEDAN = 'SEDAN',
  // Extensible: SUV = 'SUV' can be added cleanly here
}

export const CAR_TYPE_MULTIPLIERS: Record<CarType, number> = {
  [CarType.HATCHBACK]: 1.0,
  [CarType.SEDAN]: 1.2, // Sedan has higher pricing rate as requested
};
