import db from "../config/db.js";
import { redis } from "../config/redis.js";
import { haversineDistance } from "../utils/geo.js";

/**
 * Cache trip stops with distances.
 * Called ONCE when trip starts.
 */
export async function cacheTripStops(tripId) {
  const [rows] = await db.query(
    `
    SELECT
      ts.stop_order,
      s.stop_id,
      s.latitude,
      s.longitude
    FROM trip_stoppages ts
    JOIN stoppages s ON s.stop_id = ts.stop_id
    WHERE ts.trip_id = ?
    ORDER BY ts.stop_order ASC
    `,
    [tripId]
  );

  if (!rows.length) return;

  const stops = [];

  for (let i = 0; i < rows.length; i++) {
    let distToNext = null;

    if (i < rows.length - 1) {
      distToNext = haversineDistance(
        rows[i].latitude,
        rows[i].longitude,
        rows[i + 1].latitude,
        rows[i + 1].longitude
      );
    }

    stops.push({
      order: rows[i].stop_order,
      stopId: rows[i].stop_id,
      lat: rows[i].latitude,
      lng: rows[i].longitude,
      distToNext // meters
    });
  }

  await redis.set(
    `trip:${tripId}:stops`,
    JSON.stringify({
      stops,
      totalStops: stops.length
    })
  );
}
