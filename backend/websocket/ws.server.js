import WebSocket, { WebSocketServer } from "ws";

export const wss = new WebSocketServer({ port: 8080 });

wss.on("connection", ws => {
  ws.busIds = [];

  ws.on("message", msg => {
    try {
      const data = JSON.parse(msg);
      if (data.type === "SUBSCRIBE_BUS") {
        ws.busIds = data.busIds || [];
      }
    } catch (err) {
      console.error("WS message parse error:", err.message);
    }
  });

  ws.on("error", (err) => {
    console.error("WS client error:", err.message);
  });
});

wss.on("error", (err) => {
  console.error("WS server error:", err.message);
});

console.log("WebSocket server running on port 8080");
