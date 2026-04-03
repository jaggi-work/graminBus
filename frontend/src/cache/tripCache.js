const tripCache = new Map(); // busId -> trips[]

export const getCachedTrips = (busId) => {
  return tripCache.get(busId) || null;
};

// export const setCachedTrips = (busId, trips) => {
//   tripCache.set(busId, trips);
// };

export const setCachedTrips = (busId, trips) => {
  const withParsed = trips.map(trip => {
    if (trip._stops_json && !trip._parsedStops) {
      return { ...trip, _parsedStops: JSON.parse(trip._stops_json) };
    }
    return trip;
  });
  tripCache.set(busId, withParsed);
};

export const clearTripCache = () => {
  tripCache.clear();
};

// ─────────────────────────────────────────────────────────────────
// ✅ FIX #3 — PRE-PARSE STOPS WHEN CACHING
// Call this in tripCache.js instead of raw setCachedTrips.
// This means JSON.parse NEVER runs during a screen transition.
// ─────────────────────────────────────────────────────────────────
export function setCachedTripsWithParse(busId, trips) {
  const parsed = trips.map(trip => {
    if (trip._stops_json && !trip._parsedStops) {
      return { ...trip, _parsedStops: JSON.parse(trip._stops_json) };
    }
    return trip;
  });
  setCachedTrips(busId, parsed);
}
// ↑ Replace all setCachedTrips(busId, trips) calls in BusList.js
//   and prefetchTrips() with setCachedTripsWithParse(busId, trips)
