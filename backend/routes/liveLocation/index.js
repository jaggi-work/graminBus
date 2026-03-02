import express from 'express';
import db from '../../config/db.js';
import { cacheTripStops } from '../../services/tripCache.service.js';
import { redis } from '../../config/redis.js';
import { haversineDistance } from '../../utils/geo.js';
import { timeToMinutes } from '../../utils/time.js';
import {
    STOP_CONFIRM_SECONDS,
    STOP_RADIUS_METERS,
    LOW_SPEED_THRESHOLD,
    STOP_HISTORY_LIMIT,
    FINAL_STOP_RADIUS_M
} from '../../utils/constants.js';

const router = express.Router();

const TIME_TOLERANCE_MIN = 30;  // minutes before/after schedule
const MAX_START_STOP_RADIUS_M = 800;

router.post("/driver/start-trip", async (req, res) => {
    try {
        const { busId, latitude, longitude } = req.body;

        if (!busId || !latitude || !longitude) {
            return res.status(400).json({
                success: false,
                message: "busId, latitude, longitude are required",
            });
        }

        console.log(busId, latitude, longitude);

        const busLat = Number(latitude);
        const busLng = Number(longitude);

        if (!Number.isFinite(busLat) || !Number.isFinite(busLng)) {
            return res.status(400).json({
                success: false,
                message: "Invalid latitude/longitude",
            });
        }

        /* --------------------------------------------------
           1. Fetch trips (DB – cold path, OK)
        -------------------------------------------------- */
        const [trips] = await db.query(
            `SELECT trip_id, bus_id, start_stop_id, start_time, end_time
       FROM trips
       WHERE bus_id = ?`,
            [busId]
        );
        console.log(trips);

        if (!trips.length) {
            return res.status(404).json({
                success: false,
                message: "No trips configured for this bus",
            });
        }

        /* --------------------------------------------------
           2. Filter by time window
        -------------------------------------------------- */
        const now = new Date();
        const nowMin = now.getHours() * 60 + now.getMinutes();

        const candidates = trips.filter(t => {
            const start = timeToMinutes(t.start_time);
            const end = timeToMinutes(t.end_time);
            return (
                nowMin >= start - TIME_TOLERANCE_MIN &&
                nowMin <= end + TIME_TOLERANCE_MIN
            );
        });

        if (!candidates.length) {
            return res.status(404).json({
                success: false,
                message: "No active trip window right now",
            });
        }
        console.log(candidates);

        /* --------------------------------------------------
           3. Load start stops (DB once)
        -------------------------------------------------- */
        const startStopIds = [...new Set(candidates.map(c => c.start_stop_id))];

        const [stops] = await db.query(
            `SELECT stop_id, latitude, longitude
       FROM stoppages
       WHERE stop_id IN (?)`,
            [startStopIds]
        );

        const stopMap = Object.fromEntries(
            stops.map(s => [s.stop_id, s])
        );

        /* --------------------------------------------------
           4. Choose nearest valid trip
        -------------------------------------------------- */
        let chosenTrip = null;
        let bestDist = Infinity;

        for (const trip of candidates) {
            const stop = stopMap[trip.start_stop_id];
            if (!stop) continue;

            const dist = haversineDistance(
                busLat,
                busLng,
                Number(stop.latitude),
                Number(stop.longitude)
            );

            if (dist < bestDist) {
                bestDist = dist;
                chosenTrip = trip;
            }
        }

        if (!chosenTrip) {
            return res.status(500).json({
                success: false,
                message: "Unable to detect active trip",
            });
        }

        if (bestDist > MAX_START_STOP_RADIUS_M) {
            return res.status(400).json({
                success: false,
                message: "Too far from starting stop",
                distance: Math.round(bestDist),
            });
        }

        /* --------------------------------------------------
           5. Cache trip stops in Redis (CRITICAL)
        -------------------------------------------------- */
        await cacheTripStops(chosenTrip.trip_id);

        /* --------------------------------------------------
           6. Initialize bus runtime state in Redis
        -------------------------------------------------- */
        await redis.hset(`bus:${busId}`, {
            tripId: chosenTrip.trip_id,
            lat: busLat,
            lng: busLng,
            currentStopOrder: 1,
            upcomingStopOrder: 2,
            candidateStopOrder: "",
            candidateSince: "",
            direction: "FORWARD",
            stopHistory: JSON.stringify([1]),
            avgSpeed: "",
            lastUpdated: Date.now()
        });

        /* --------------------------------------------------
           7. Persist active trip (DB – once)
        -------------------------------------------------- */
        await db.query(
            `INSERT INTO active_bus_trip (bus_id, trip_id, started_at)
       VALUES (?, ?, NOW())
       ON DUPLICATE KEY UPDATE
         trip_id = VALUES(trip_id),
         started_at = NOW()`,
            [busId, chosenTrip.trip_id]
        );

        /* --------------------------------------------------
           8. Respond
        -------------------------------------------------- */
        return res.json({
            success: true,
            message: "Trip started",
            tripId: chosenTrip.trip_id,
            distanceFromStartStop: Math.round(bestDist),
        });

    } catch (err) {
        console.error("start-trip error", err);
        return res.status(500).json({
            success: false,
            message: "Server error",
        });
    }
});

// ---------------------------------------------------------------------------------------------------------------------

router.post("/driver/location", async (req, res) => {
    try {
        const { bus_id, latitude, longitude } = req.body;

        const lat = Number(latitude);
        const lng = Number(longitude);

        if (!bus_id || !Number.isFinite(lat) || !Number.isFinite(lng)) {
            return res.status(400).json({ success: false });
        }

        /* ----------------------------
           Load live bus state (Redis)
        ---------------------------- */
        const bus = await redis.hgetall(`bus:${bus_id}`);
        if (!bus.tripId) {
            return res.status(400).json({ success: false, message: "Trip not started" });
        }

        const tripCache = await redis.get(`trip:${bus.tripId}:stops`);
        if (!tripCache) {
            return res.status(500).json({ success: false });
        }

        const { stops } = JSON.parse(tripCache);

        console.log(stops);

        /* ----------------------------
          Find nearest stop (same)
        ---------------------------- */
        let nearestOrder = null;
        let nearestDist = Infinity;

        for (const s of stops) {
            const d = haversineDistance(lat, lng, s.lat, s.lng);
            if (d < nearestDist) {
                nearestDist = d;
                nearestOrder = s.order;
            }
        }

        const now = Date.now();
        let {
            currentStopOrder,
            candidateStopOrder,
            candidateSince,
            avgSpeed,
            direction,
            stopHistory
        } = bus;

        currentStopOrder = currentStopOrder ? Number(currentStopOrder) : null;
        candidateStopOrder = candidateStopOrder ? Number(candidateStopOrder) : null;
        candidateSince = candidateSince ? Number(candidateSince) : null;
        avgSpeed = avgSpeed ? Number(avgSpeed) : null;
        direction = direction || "FORWARD";
        stopHistory = stopHistory ? JSON.parse(stopHistory) : [];

        /* ----------------------------
          Speed calculation (same)
        ---------------------------- */
        if (bus.lat && bus.lng && bus.lastUpdated) {
            const dist = haversineDistance(
                Number(bus.lat),
                Number(bus.lng),
                lat,
                lng
            );
            const timeSec = (now - Number(bus.lastUpdated)) / 1000;
            if (timeSec > 0) {
                const instant = dist / timeSec;
                if (instant >= 0.5 && instant <= 35) {
                    avgSpeed = avgSpeed
                        ? avgSpeed * 0.7 + instant * 0.3
                        : instant;
                }
            }
        }

        /* ----------------------------
           STOP CONFIRMATION LOGIC (NEW)
        ---------------------------- */
        let confirmedStopOrder = currentStopOrder;

        if (nearestDist <= STOP_RADIUS_METERS) {
            if (candidateStopOrder !== nearestOrder) {
                candidateStopOrder = nearestOrder;
                candidateSince = now;
            } else {
                const heldSeconds = (now - candidateSince) / 1000;
                const lowSpeed = !avgSpeed || avgSpeed <= LOW_SPEED_THRESHOLD;

                if (heldSeconds >= STOP_CONFIRM_SECONDS && lowSpeed) {
                    confirmedStopOrder = candidateStopOrder;

                    // update direction
                    if (currentStopOrder !== null) {
                        direction =
                            confirmedStopOrder > currentStopOrder
                                ? "FORWARD"
                                : confirmedStopOrder < currentStopOrder
                                    ? "REVERSING"
                                    : direction;
                    }

                    // update history
                    stopHistory.push(confirmedStopOrder);
                    if (stopHistory.length > STOP_HISTORY_LIMIT) {
                        stopHistory.shift();
                    }

                    candidateStopOrder = null;
                    candidateSince = null;
                }
            }
        } else {
            candidateStopOrder = null;
            candidateSince = null;
        }

        const upcoming = stops.find(s => s.order > confirmedStopOrder);

        /* --------------------------------
       AUTO END TRIP AT FINAL STOP
    -------------------------------- */
        const lastStop = stops[stops.length - 1];

        if (
            lastStop &&
            nearestOrder === lastStop.order &&
            nearestDist <= FINAL_STOP_RADIUS_M
        ) {
            console.log(`Bus ${bus_id} reached final stop. Auto ending trip.`);

            // 1️⃣ remove active trip (DB)
            await db.query(
                "DELETE FROM active_bus_trip WHERE bus_id = ?",
                [bus_id]
            );

            // 2️⃣ cleanup Redis
            await redis.del(`bus:${bus_id}`);
            await redis.del(`trip:${bus.tripId}:stops`);

            // 3️⃣ notify subscribers (optional)
            await redis.publish(
                `bus:${bus_id}:end`,
                JSON.stringify({
                    type: "TRIP_ENDED",
                    busId: bus_id,
                    tripId: bus.tripId,
                    reason: "AUTO_FINAL_STOP"
                })
            );

            return res.json({
                success: true,
                autoEnded: true,
                message: "Trip automatically ended at final stop"
            });
        }


        /* ----------------------------
           Update Redis + publish
        ---------------------------- */
        await redis.hset(`bus:${bus_id}`, {
            lat,
            lng,
            currentStopOrder: confirmedStopOrder,
            upcomingStopOrder: upcoming ? upcoming.order : null,
            avgSpeed,
            direction,
            candidateStopOrder,
            candidateSince,
            stopHistory: JSON.stringify(stopHistory),
            lastUpdated: now
        });

        await redis.publish(
            `bus:${bus_id}:update`,
            JSON.stringify({
                type: "BUS_UPDATE",
                busId: bus_id,
                lat,
                lng,
                currentStopOrder: confirmedStopOrder,
                direction
            })
        );

        return res.json({ success: true });

    } catch (err) {
        console.error(err);
        return res.status(500).json({ success: false });
    }
});

// ----------------------------------------------------------------------------------------------------------------

router.get("/next-buses", async (req, res) => {
    try {
        const { fromStopId, toStopId, limit = 5 } = req.body;

        if (!fromStopId || !toStopId) {
            return res.status(400).json({
                success: false,
                message: "fromStopId and toStopId are required"
            });
        }

        /* ------------------------------------------------
           1. Find candidate trips (DB)
           ------------------------------------------------ */
        const [rows] = await db.query(
            `
      SELECT
        t.trip_id,
        t.bus_id,
        b.bus_name,
        ts_from.stop_order AS from_order,
        ts_to.stop_order   AS to_order
      FROM trips t
      JOIN buses b ON b.bus_id = t.bus_id
      JOIN active_bus_trip abt ON abt.bus_id = t.bus_id
      JOIN trip_stoppages ts_from
        ON ts_from.trip_id = t.trip_id AND ts_from.stop_id = ?
      JOIN trip_stoppages ts_to
        ON ts_to.trip_id = t.trip_id AND ts_to.stop_id = ?
      WHERE ts_from.stop_order < ts_to.stop_order
      LIMIT ?
      `,
            [fromStopId, toStopId, Number(limit)]
        );

        const results = [];

        /* ------------------------------------------------
           2. Attach live state + compute PASSENGER ETA
           ------------------------------------------------ */
        for (const r of rows) {
            const live = await redis.hgetall(`bus:${r.bus_id}`);
            if (!live.tripId || !live.currentStopOrder) continue;

            const currentOrder = Number(live.currentStopOrder);

            // bus already passed passenger stop
            if (currentOrder > r.from_order) continue;

            const speed =
                live.avgSpeed && Number(live.avgSpeed) > 0
                    ? Number(live.avgSpeed)
                    : 6; // fallback m/s (~22 km/h)

            /* ----------------------------
               Load trip cache
            ---------------------------- */
            const tripCacheRaw = await redis.get(`trip:${r.trip_id}:stops`);
            if (!tripCacheRaw) continue;

            const { stops } = JSON.parse(tripCacheRaw);

            /* ----------------------------
               Distance calculation
            ---------------------------- */
            let distanceMeters = 0;

            // 1️⃣ distance from bus GPS to next stop
            const nextStop = stops.find(s => s.order === currentOrder + 1);
            if (nextStop && live.lat && live.lng) {
                distanceMeters += haversineDistance(
                    Number(live.lat),
                    Number(live.lng),
                    nextStop.lat,
                    nextStop.lng
                );
            }

            // 2️⃣ stop-to-stop distances until passenger stop
            for (const s of stops) {
                if (
                    s.order >= currentOrder + 1 &&
                    s.order < r.from_order &&
                    s.distToNext
                ) {
                    distanceMeters += s.distToNext;
                }
            }

            if (!isFinite(distanceMeters) || distanceMeters <= 0) continue;

            const etaMinutes = Math.max(
                Math.round(distanceMeters / speed / 60),
                1
            );

            /* ----------------------------
               Stops remaining
            ---------------------------- */
            const stopsRemaining = r.from_order - currentOrder;

            /* ----------------------------
               Live state
            ---------------------------- */
            const lastUpdated = Number(live.lastUpdated || 0);
            const diffMin = (Date.now() - lastUpdated) / 60000;

            let liveState;
            if (diffMin <= 2) liveState = "live";
            else if (diffMin <= 5) liveState = "stale";
            else liveState = "offline";

            let status;
            if (liveState === "offline") status = "not_tracking";
            else if (stopsRemaining <= 0) status = "arriving";
            else if (stopsRemaining <= 2) status = "approaching";
            else status = "on_the_way";

            results.push({
                tripId: r.trip_id,
                busId: r.bus_id,
                bus_name: r.bus_name,
                etaMinutes,
                stopsRemaining,
                status,
                liveState
            });
        }

        /* ------------------------------------------------
           3. Sort by ETA
           ------------------------------------------------ */
        results.sort((a, b) => a.etaMinutes - b.etaMinutes);

        res.json({
            success: true,
            count: results.length,
            trips: results
        });

    } catch (err) {
        console.error("next-buses error:", err);
        res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
});


router.post("/driver/end-trip", async (req, res) => {
    try {
        const { busId } = req.body;

        if (!busId) {
            return res.status(400).json({
                success: false,
                message: "busId is required"
            });
        }

        /* --------------------------------
           1. Find active trip (DB)
        -------------------------------- */
        const [rows] = await db.query(
            "SELECT trip_id FROM active_bus_trip WHERE bus_id = ? LIMIT 1",
            [busId]
        );

        if (rows.length === 0) {
            return res.status(400).json({
                success: false,
                message: "No active trip found for this bus"
            });
        }

        const tripId = rows[0].trip_id;

        /* --------------------------------
           2. Remove active trip (DB)
        -------------------------------- */
        await db.query(
            "DELETE FROM active_bus_trip WHERE bus_id = ?",
            [busId]
        );

        /* --------------------------------
           3. Clean Redis runtime state
        -------------------------------- */
        await redis.del(`bus:${busId}`);

        // optional cleanup
        await redis.del(`trip:${tripId}:stops`);

        /* --------------------------------
           4. Notify subscribers (optional)
        -------------------------------- */
        await redis.publish(
            `bus:${busId}:end`,
            JSON.stringify({
                type: "TRIP_ENDED",
                busId,
                tripId
            })
        );

        res.json({
            success: true,
            message: "Trip ended successfully"
        });

    } catch (err) {
        console.error("end-trip error:", err);
        res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
});


export default router;