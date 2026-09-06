import { io } from "socket.io-client";

let socket;

export const getSocket = () => {
  if (!socket) {
    socket = io(import.meta.env.VITE_SOCKET_URL || "http://localhost:5000", {
      autoConnect: true,
      transports: ["websocket", "polling"],
    });
  }
  return socket;
};

export const joinBusinessRoom = (businessId, onUpdate) => {
  if (!businessId) return () => {};
  const client = getSocket();

  const join = () => client.emit("joinBusinessRoom", businessId);
  const handleUpdate = (payload) => {
    if (!payload?.businessId || String(payload.businessId) === String(businessId)) {
      onUpdate?.(payload);
    }
  };

  client.on("connect", join);
  client.on("queue:updated", handleUpdate);
  client.on("appointment:created", handleUpdate);
  client.on("appointment:updated", handleUpdate);
  if (client.connected) join();

  return () => {
    client.off("connect", join);
    client.off("queue:updated", handleUpdate);
    client.off("appointment:created", handleUpdate);
    client.off("appointment:updated", handleUpdate);
    client.emit("leaveBusinessRoom", businessId);
  };
};
