export interface Location {
  x: number;
  y: number;
  latitude?: number;
  longitude?: number;
}

/** Validate coordinates including latitude/longitude bounds. */
export function validateLocation(loc: Location): void {
  if (!loc || typeof loc !== 'object') {
    throw new Error('Location is required and must be an object');
  }
  if (loc.x === undefined || loc.y === undefined || typeof loc.x !== 'number' || typeof loc.y !== 'number' || isNaN(loc.x) || isNaN(loc.y)) {
    throw new Error('Missing or invalid coordinates: x and y must be valid numbers');
  }
  if (loc.latitude !== undefined && (loc.latitude < -90 || loc.latitude > 90)) {
    throw new Error(`Invalid latitude: ${loc.latitude}. Latitude must be between -90 and 90`);
  }
  if (loc.longitude !== undefined && (loc.longitude < -180 || loc.longitude > 180)) {
    throw new Error(`Invalid longitude: ${loc.longitude}. Longitude must be between -180 and 180`);
  }
}

/** Validate geographic latitude and longitude. */
export function validateGeoCoordinates(latitude: number, longitude: number): void {
  if (latitude === undefined || longitude === undefined || typeof latitude !== 'number' || typeof longitude !== 'number' || isNaN(latitude) || isNaN(longitude)) {
    throw new Error('Missing latitude/longitude');
  }
  if (latitude < -90 || latitude > 90) {
    throw new Error(`Invalid latitude: ${latitude}. Latitude must be between -90 and 90`);
  }
  if (longitude < -180 || longitude > 180) {
    throw new Error(`Invalid longitude: ${longitude}. Longitude must be between -180 and 180`);
  }
}
