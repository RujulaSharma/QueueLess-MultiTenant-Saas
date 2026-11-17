import { io } from "socket.io-client";
import api from "./api";

let socket;

export const getSocket = () => {
  if (!socket) {
    socket = io(import.meta.env.VITE_SOCKET_URL || api.defaults.baseURL.replace(/\/api\/?$/, ""), {
      autoConnect: true,
      auth: (callback) => callback({ token: localStorage.getItem("queueless_token") }),
    });
  }
  return socket;
};

export const disconnectSocket = () => socket?.disconnect();

export const joinBusinessRoom = (businessId, onUpdate, onConnection) => {
  if (!businessId) return () => {};
  const client = getSocket();
  if (!client.active && !client.connected) client.connect();

  let active = true;
  const join = () => client.timeout(5000).emit("joinBusinessRoom", businessId, (error, allowed) => {
    if (!active) return;
    onConnection?.(!error && allowed === true);
    if (!error && allowed) onUpdate?.();
  });
  const disconnected = () => onConnection?.(false);
  client.on("disconnect", disconnected);
  client.on("connect_error", disconnected);
  const handleUpdate = (payload) => {
    if (String(payload?.businessId) === String(businessId)) {
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
    active = false;
    client.off("disconnect", disconnected);
    client.off("connect_error", disconnected);
    client.off("queue:updated", handleUpdate);
    client.off("appointment:created", handleUpdate);
    client.off("appointment:updated", handleUpdate);
    if (client.connected) client.emit("leaveBusinessRoom", businessId);
  };
};

export const joinProjectRoom = (projectId, onEvent) => {
  if (!projectId) return () => {};
  const client = getSocket();
  if (!client.active && !client.connected) client.connect();

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
  const handlers = events.map((event) => [event, handleEvent(event)]);
  handlers.forEach(([event, handler]) => client.on(event, handler));

  if (client.connected) join();

  return () => {
    client.off("connect", join);
    handlers.forEach(([event, handler]) => client.off(event, handler));
    if (client.connected) client.emit("leaveProjectRoom", projectId);
  };
};

