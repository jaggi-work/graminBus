import WebSocket from "ws";
import { redis } from "../config/redis";

const wss = new WebSocket.Server({ port: 8080 });

wss.on("connection", ws => {
    ws.busIds = [];

    ws.on("message", msg => {
        const data = JSON.parse(msg);

        if (data.type === "SUBSCRIBE_BUS") {
            ws.busIds = data.busIds || [];
        }
    });
});
