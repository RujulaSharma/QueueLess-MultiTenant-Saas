import { useEffect } from "react";
import { io } from "socket.io-client";

const SOCKET_URL =
  import.meta.env.VITE_SOCKET_URL || "http://localhost:5000";

export default function useBusinessRealtime(businessId, onUpdate) {
  useEffect(() => {
    if (!businessId) return undefined;

    const socket = io(SOCKET_URL, {
      transports: ["websocket", "polling"],
      autoConnect: true,
    });

    socket.on("connect", () => {
      socket.emit("joinBusinessRoom", businessId);
    });

    const events = [
      "queue:updated",
      "appointment:created",
      "appointment:updated",
    ];

    events.forEach((event) => socket.on(event, onUpdate));

    return () => {
      events.forEach((event) => socket.off(event, onUpdate));
      socket.disconnect();
    };
  }, [businessId, onUpdate]);
}
