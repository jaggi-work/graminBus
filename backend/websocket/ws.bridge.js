import { WebSocket } from "ws";
import { redis, createSubscriber } from "../config/redis.js";
import { wss } from "./ws.server.js";

const redisSub = createSubscriber();

redisSub.psubscribe("bus:*:update", "bus:*:eta", (err) => {
  if (err) console.error("WS bridge psubscribe error:", err.message);
});

redisSub.on("pmessage", (_, channel, msg) => {
  try {
    const payload = JSON.parse(msg);

    wss.clients.forEach(client => {
      if (
        client.readyState === WebSocket.OPEN &&
        client.busIds?.includes(payload.busId)
      ) {
        client.send(JSON.stringify(payload));
      }
    });
  } catch (err) {
    console.error("WS bridge pmessage error:", err.message);
  }
});
