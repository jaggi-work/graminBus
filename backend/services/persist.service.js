import { redis } from "../config/redis.js";
import db from "../config/db.js";

setInterval(async () => {
  try {
    // Use SCAN instead of KEYS to avoid blocking Redis
    const keys = [];
    let cursor = "0";
    do {
      const [nextCursor, batch] = await redis.scan(cursor, "MATCH", "bus:*", "COUNT", 100);
      cursor = nextCursor;
      // Only keep plain bus hashes (bus:<id>), not bus:<id>:update etc.
      keys.push(...batch.filter(k => k.split(":").length === 2));
    } while (cursor !== "0");

    for (const key of keys) {
      const busId = key.split(":")[1];
      const s = await redis.hgetall(key);

      if (!s || !s.lat || !s.lng) continue;

      await db.query(`
        INSERT INTO bus_locations
          (bus_id, latitude, longitude, current_stop_id, avg_speed_mps, last_updated)
        VALUES (?, ?, ?, ?, ?, NOW())
        ON DUPLICATE KEY UPDATE
          latitude        = VALUES(latitude),
          longitude       = VALUES(longitude),
          current_stop_id = VALUES(current_stop_id),
          avg_speed_mps   = VALUES(avg_speed_mps),
          last_updated    = NOW()
      `, [
        busId,
        s.lat,
        s.lng,
        s.currentStopOrder || null,
        s.avgSpeed || null
      ]);
    }
  } catch (err) {
    console.error("Persist service error:", err.message);
  }
}, 20000);
