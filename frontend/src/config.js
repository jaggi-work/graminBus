// ─── Central API Configuration ───────────────────────────────────────────────
// Change ONLY the IP below when your server IP changes.
//
// Physical device  →  your machine's WiFi IP, e.g. "192.168.1.5"
// Android emulator →  "10.0.2.2"
// iOS simulator    →  "localhost"

// const SERVER_IP = "192.168.31.101";
const SERVER_IP = "10.0.2.2";

export const API_URL = `http://${SERVER_IP}:3000`;
export const WS_URL  = `ws://${SERVER_IP}:8080`;  // WebSocket server
