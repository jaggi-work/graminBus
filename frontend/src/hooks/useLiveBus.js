import { useEffect, useRef, useState } from "react";
import { WS_URL } from "../config";

export function useLiveBus(busId) {
  const [live, setLive] = useState(null);
  const wsRef = useRef(null);

  useEffect(() => {
    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      ws.send(JSON.stringify({
        type: "SUBSCRIBE_BUS",
        busIds: [busId]
      }));
    };

    ws.onmessage = (e) => {
      const data = JSON.parse(e.data);
      setLive(data);
    };

    ws.onclose = () => {
      // auto reconnect
      setTimeout(() => {
        wsRef.current = null;
      }, 2000);
    };

    return () => ws.close();
  }, [busId]);

  return live;
}