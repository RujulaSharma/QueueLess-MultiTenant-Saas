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

export const joinProjectRoom = (projectId, onEvent) => {
  if (!projectId) return () => {};
  const client = getSocket();

  const join = () => client.emit("joinProjectRoom", projectId);
  
  const handleEvent = (eventName) => (payload) => {
    onEvent?.(eventName, payload);
  };

  const events = [
    "project:updated",
    "project:deleted",
    "project:progress_updated",
    "task:created",
    "task:updated",
    "task:status_changed",
    "task:assigned",
    "task:comment_added",
    "task:file_attached",
    "task:file_deleted",
    "task:deleted",
  ];

  client.on("connect", join);
  events.forEach((evt) => {
    client.on(evt, handleEvent(evt));
  });

  if (client.connected) join();

  return () => {
    client.off("connect", join);
    events.forEach((evt) => {
      client.off(evt, handleEvent(evt));
    });
    client.emit("leaveProjectRoom", projectId);
  };
};

