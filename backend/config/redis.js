import Redis from "ioredis";

const REDIS_CONFIG = {
  host: process.env.REDIS_HOST || "127.0.0.1",
  port: Number(process.env.REDIS_PORT) || 6379,
  connectTimeout: 10000,
};

// Main client (commands only — never subscribe on this)
const redis = new Redis(REDIS_CONFIG);

redis.on("error", (err) => {
  console.error("Redis error:", err.message);
});
redis.on("connect", () => {
  console.log("Redis connected");
});

/**
 * createSubscriber()
 * Returns a fresh ioredis connection dedicated to pub/sub.
 * Each caller (etaWorker, ws.bridge) gets its own connection
 * so psubscribe patterns don't clash or double-fire.
 */
function createSubscriber() {
  const sub = new Redis(REDIS_CONFIG);
  sub.on("error", (err) => {
    console.error("Redis subscriber error:", err.message);
  });
  return sub;
}

export { redis, createSubscriber };
