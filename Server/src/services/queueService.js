const Queue = require("../models/Queue");
const Service = require("../models/Service");

const ACTIVE_STATUSES = ["WAITING", "CALLED", "SERVING"];

const buildScope = (businessId, serviceId, scope = {}) => ({
  business: businessId,
  service: serviceId,
  ...(scope.doctorId ? { doctor: scope.doctorId } : {}),
  ...(scope.departmentId ? { department: scope.departmentId } : {}),
  status: { $in: ACTIVE_STATUSES },
});

const recalculateQueue = async (businessId, serviceId, scope = {}) => {
  const entries = await Queue.find(buildScope(businessId, serviceId, scope))
    .sort({ priority: -1, joinedAt: 1 });

  const service = await Service.findById(serviceId).select("averageDuration");
  const averageDuration = Number(service?.averageDuration || 15);
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

const emitQueueUpdate = async (io, businessId, serviceId, action, scope = {}) => {
  if (!io) return;
  const queue = await recalculateQueue(businessId, serviceId, scope);

  io.to(`business:${businessId}`).emit("queue:updated", {
    action,
    businessId,
    serviceId,
    doctorId: scope.doctorId || null,
    departmentId: scope.departmentId || null,
    queue,
    updatedAt: new Date().toISOString(),
  });
};

module.exports = { ACTIVE_STATUSES, recalculateQueue, emitQueueUpdate };
