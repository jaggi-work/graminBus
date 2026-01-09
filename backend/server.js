import http from "http";
import app from "./app.js";
import { initWebSocket } from "./websocket/ws.server.js";

const server = http.createServer(app);

initWebSocket(server);

server.listen(3000, () => {
  console.log("Server running on port 3000");
});