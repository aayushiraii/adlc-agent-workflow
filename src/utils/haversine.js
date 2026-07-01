'use strict';

/**
 * Haversine formula — calculates the great-circle distance between two
 * geographic coordinates on a sphere (Earth radius ≈ 6371 km).
 *
 * @param {number} lat1 - Latitude of point 1 (decimal degrees)
 * @param {number} lng1 - Longitude of point 1 (decimal degrees)
 * @param {number} lat2 - Latitude of point 2 (decimal degrees)
 * @param {number} lng2 - Longitude of point 2 (decimal degrees)
 * @returns {number} Distance in kilometres, rounded to 2 decimal places.
 */
function haversineDistance(lat1, lng1, lat2, lng2) {
  const EARTH_RADIUS_KM = 6371;

  const toRad = (deg) => (deg * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distanceKm = EARTH_RADIUS_KM * c;

  return Math.round(distanceKm * 100) / 100; // 2 decimal places
}

/**
 * Annotates each restaurant in the given array with a `distanceKm` field
 * calculated from the user's coordinates, then returns the array sorted
 * by ascending distance.
 *
 * @param {Array<Object>} restaurants - Array of restaurant objects, each with `lat` and `lng`.
 * @param {number}        userLat     - User latitude  (decimal degrees).
 * @param {number}        userLng     - User longitude (decimal degrees).
 * @returns {Array<Object>} New array sorted by distanceKm ascending.
 */
function sortByDistance(restaurants, userLat, userLng) {
  return restaurants
    .map((r) => ({
      ...r,
      distanceKm: haversineDistance(userLat, userLng, r.lat, r.lng),
    }))
    .sort((a, b) => a.distanceKm - b.distanceKm);
}

module.exports = { haversineDistance, sortByDistance };
