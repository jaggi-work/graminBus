import { redis, createSubscriber } from "../config/redis.js";

const FALLBACK_SPEED_MPS = 6; // ~22 km/h
const ETA_CHANGE_THRESHOLD_MIN = 1; // avoid noise

const redisSub = createSubscriber();

redisSub.psubscribe("bus:*:update", (err) => {
  if (err) console.error("ETA worker psubscribe error:", err.message);
});

redisSub.on("pmessage", async (_, channel, msg) => {
  try {
    const payload = JSON.parse(msg);
    const busId = payload.busId;

    const bus = await redis.hGetAll(`bus:${busId}`);
    if (!bus.tripId || !bus.currentStopOrder) return;

    const tripCacheRaw = await redis.get(`trip:${bus.tripId}:stops`);
    if (!tripCacheRaw) return;

    const { stops } = JSON.parse(tripCacheRaw);

    const currentOrder = Number(bus.currentStopOrder);
    const speed =
      bus.avgSpeed && Number(bus.avgSpeed) > 0
        ? Number(bus.avgSpeed)
        : FALLBACK_SPEED_MPS;

    /* ---------------------------------
       Remaining distance calculation
       (same idea as your old code)
    --------------------------------- */
    let remainingMeters = 0;

    for (const s of stops) {
      if (s.order >= currentOrder && s.distToNext) {
        remainingMeters += s.distToNext;
      }
    }

    if (remainingMeters <= 0) return;

    const etaMinutes = Math.max(
      Math.round(remainingMeters / speed / 60),
      1
    );

    const prevEta = bus.etaMinutes ? Number(bus.etaMinutes) : null;

    // avoid jitter
    if (
      prevEta !== null &&
      Math.abs(prevEta - etaMinutes) < ETA_CHANGE_THRESHOLD_MIN
    ) {
      return;
    }

    await redis.hSet(`bus:${busId}`, {
      etaMinutes,
      remainingMeters
    });

    await redis.publish(
      `bus:${busId}:eta`,
      JSON.stringify({
        type: "ETA_UPDATE",
        busId,
        etaMinutes
      })
    );

  } catch (err) {
    console.error("ETA worker error:", err);
  }
});
