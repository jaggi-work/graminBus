import http from "http";
import app from "./app.js";

// Side-effect imports: start WebSocket server and background services
import "./websocket/ws.server.js";
import "./websocket/ws.bridge.js";
import "./services/etaWorker.service.js";
import "./services/persist.service.js";

const server = http.createServer(app);

server.listen(process.env.PORT || 3000, "0.0.0.0", () => {
  console.log(`Server running on port ${process.env.PORT || 3000}`);
});