// import Redis from "ioredis";

// export const redis = new Redis({
//   host: "127.0.0.1",
//   port: 6379
// });

const Redis = require("ioredis");

const redis = new Redis({
  host: "127.0.0.1",
  port: 6379,
  // This helps prevent long hang times if Redis is down
  connectTimeout: 10000 
});

// Pub/Sub subscriber
const redisSub = new Redis({
  host: "127.0.0.1",
  port: 6379,
});
// ADD THIS: It catches the ECONNREFUSED error so your app doesn't crash
redis.on("error", (err) => {
  console.error("Redis connection error:", err.message);
});

redis.on("connect", () => {
  console.log("Successfully connected to Redis");
});

module.exports = { redis ,redisSub };
