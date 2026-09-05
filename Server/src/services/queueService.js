const Queue = require("../models/Queue");
const Service = require("../models/Service");

const ACTIVE_STATUSES = ["WAITING", "CALLED", "SERVING"];

const recalculateQueue = async (businessId, serviceId) => {
  const entries = await Queue.find({
    business: businessId,
    service: serviceId,
    status: { $in: ACTIVE_STATUSES },
  }).sort({ priority: -1, joinedAt: 1 });

  const service = await Service.findById(serviceId).select("averageDuration");
  const averageDuration = service?.averageDuration || 15;

  let waitingPosition = 0;

  for (const entry of entries) {
    if (entry.status === "WAITING") {
      waitingPosition += 1;
      entry.position = waitingPosition;
      entry.estimatedWaitTime = waitingPosition * averageDuration;
    } else {
      entry.position = 0;
      entry.estimatedWaitTime = 0;
    }

    await entry.save();
  }

  return entries;
};

const emitQueueUpdate = async (io, businessId, serviceId, action) => {
  if (!io) return;

  const queue = await recalculateQueue(businessId, serviceId);

  io.to(`business:${businessId}`).emit("queue:updated", {
    action,
    businessId,
    serviceId,
    queue,
    updatedAt: new Date().toISOString(),
  });
};

module.exports = { recalculateQueue, emitQueueUpdate };
