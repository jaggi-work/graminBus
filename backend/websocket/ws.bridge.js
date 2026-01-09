import { redis } from "../config/redis.js";
import { wss } from "./ws.server.js";

redis.psubscribe("bus:*:update", "bus:*:eta");

redis.on("pmessage", (_, channel, msg) => {
  const payload = JSON.parse(msg);

  wss.clients.forEach(client => {
    if (
      client.readyState === WebSocket.OPEN &&
      client.busIds?.includes(payload.busId)
    ) {
      client.send(JSON.stringify(payload));
    }
  });
});
