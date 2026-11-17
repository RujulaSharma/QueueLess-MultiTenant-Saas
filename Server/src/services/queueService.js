const Queue = require("../models/Queue");
const Service = require("../models/Service");

const ACTIVE_STATUSES = ["WAITING", "CALLED", "SERVING"];

const buildScope = (businessId, serviceId, scope = {}) => ({
  business: businessId,
  service: serviceId,
  ...(Object.hasOwn(scope, "doctorId") ? { doctor: scope.doctorId || null } : {}),
  ...(Object.hasOwn(scope, "departmentId") ? { department: scope.departmentId || null } : {}),
  status: { $in: ACTIVE_STATUSES },
});

const recalculateQueue = async (businessId, serviceId, scope = {}) => {
  const entries = await Queue.find(buildScope(businessId, serviceId, scope))
    .sort({ priority: 1, joinedAt: 1, _id: 1 });

  const service = await Service.findById(serviceId).select("averageDuration");
  const averageDuration = Number(service?.averageDuration || 15);
  const hasCurrentVisit = entries.some((entry) => entry.status === "CALLED" || entry.status === "SERVING");
  let waitingPosition = 0;

  const operations = [];
  for (const entry of entries) {
    if (entry.status === "WAITING") {
      waitingPosition += 1;
      entry.position = waitingPosition;
      entry.estimatedWaitTime = (waitingPosition - 1 + Number(hasCurrentVisit)) * averageDuration;
    } else {
      entry.position = 0;
      entry.estimatedWaitTime = 0;
    }
    if (entry.isModified()) {
      operations.push({ updateOne: {
        filter: { _id: entry._id, status: entry.status },
        update: { $set: { position: entry.position, estimatedWaitTime: entry.estimatedWaitTime } },
      } });
    }
  }

  if (operations.length) await Queue.bulkWrite(operations);
  return entries;
};

const emitQueueUpdate = async (io, businessId, serviceId, action, scope = {}) => {
  await recalculateQueue(businessId, serviceId, scope);
  if (!io) return;

  io.to(`business:${businessId}`).emit("queue:updated", {
    businessId: String(businessId),
  });
};

module.exports = { ACTIVE_STATUSES, recalculateQueue, emitQueueUpdate };
