export enum CarType {
  HATCHBACK = 'HATCHBACK',
  SEDAN = 'SEDAN',
  SUV = 'SUV',
}

export const CAR_TYPE_MULTIPLIERS: Record<CarType, number> = {
  [CarType.HATCHBACK]: 1.0,
  [CarType.SEDAN]: 1.2,
  [CarType.SUV]: 2.0,
};
