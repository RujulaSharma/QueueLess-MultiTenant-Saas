const jwt = require("jsonwebtoken");
const { isObjectIdOrHexString } = require("mongoose");
const User = require("../models/User");
const Queue = require("../models/Queue");
const Project = require("../models/Project");

module.exports = function configureRealtime(io) {
  io.use(async (socket, next) => {
    try {
      const { userId, exp } = jwt.verify(socket.handshake.auth.token, process.env.JWT_SECRET);
      if (!await User.exists({ _id: userId, isActive: true })) return next(new Error("Authentication required"));
      socket.data.userId = userId;
      socket.data.expiresAt = exp * 1000;
      next();
    } catch {
      next(new Error("Authentication required"));
    }
  });

  io.on("connection", (socket) => {
    socket.join(`user:${socket.data.userId}`);
    const expiry = setTimeout(() => socket.disconnect(true), Math.max(0, socket.data.expiresAt - Date.now()));
    socket.once("disconnect", () => clearTimeout(expiry));

    const registerRoom = (label, prefix, authorize) => {
      const requests = new Map();
      const validId = (id) => typeof id === "string" && isObjectIdOrHexString(id);
      socket.on(`join${label}Room`, async (id, ack) => {
        const respond = (ok) => { if (typeof ack === "function") ack(ok); };
        if (!validId(id)) return respond(false);
        id = id.toLowerCase();
        if (!requests.has(id) && requests.size >= 32) return respond(false);
        const request = Symbol();
        requests.set(id, request);
        let allowed = false;
        try {
          const user = await User.findOne({ _id: socket.data.userId, isActive: true }).select("role businessId");
          allowed = user && await authorize(user, id);
        } catch {
          allowed = false;
        }
        if (!socket.connected || requests.get(id) !== request) return;
        if (allowed) await socket.join(`${prefix}:${id}`);
        else requests.delete(id);
        respond(Boolean(allowed));
      });
      socket.on(`leave${label}Room`, (id) => {
        if (!validId(id)) return;
        id = id.toLowerCase();
        requests.delete(id);
        socket.leave(`${prefix}:${id}`);
      });
    };

    registerRoom("Business", "business", (user, id) => {
      if (user.role === "CUSTOMER") {
        return Queue.exists({ business: id, customer: user._id, status: { $in: ["WAITING", "CALLED", "SERVING"] } });
      }
      return ["ADMIN", "STAFF", "DOCTOR"].includes(user.role) && String(user.businessId) === id;
    });
    registerRoom("Project", "project", (user, id) => Project.exists({
      _id: id,
      businessId: user.businessId || null,
      $or: [{ owner: user._id }, { "members.user": user._id }],
    }));
  });
};
