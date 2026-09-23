export interface Location {
  x: number;
  y: number;
}

/**
 * Calculates Euclidean distance between two 2D locations in kilometers.
 * Rounded to 2 decimal places for clarity and precision.
 */
export function calculateDistance(locA: Location, locB: Location): number {
  const dx = locA.x - locB.x;
  const dy = locA.y - locB.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  return Math.round(distance * 100) / 100;
}
