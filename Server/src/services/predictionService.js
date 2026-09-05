const Queue = require("../models/Queue");
const Service = require("../models/Service");

const ACTIVE_STATUSES = ["WAITING", "CALLED", "SERVING"];

const calculateWaitPrediction = async ({
  businessId,
  serviceId,
  targetQueueId = null,
}) => {
  const service = await Service.findById(serviceId).select(
    "averageDuration bufferTime"
  );

  if (!service) {
    throw new Error("Service not found");
  }

  const averageDuration = Math.max(Number(service.averageDuration) || 15, 1);
  const bufferTime = Math.max(Number(service.bufferTime) || 0, 0);

  const queue = await Queue.find({
    business: businessId,
    service: serviceId,
    status: { $in: ACTIVE_STATUSES },
  }).sort({ priority: -1, joinedAt: 1 });

  const targetIndex = targetQueueId
    ? queue.findIndex((entry) => String(entry._id) === String(targetQueueId))
    : -1;

  const entriesAhead =
    targetIndex >= 0 ? queue.slice(0, targetIndex) : queue.filter(
      (entry) => entry.status === "WAITING"
    );

  const servingCount = queue.filter(
    (entry) => entry.status === "SERVING"
  ).length;

  const calledCount = queue.filter(
    (entry) => entry.status === "CALLED"
  ).length;

  const waitingAhead = entriesAhead.filter(
    (entry) => entry.status === "WAITING"
  ).length;

  // A serving customer is already consuming service capacity.
  // A called customer is next and normally has little/no waiting time.
  const baseWait =
    waitingAhead * (averageDuration + bufferTime);

  const currentServiceLoad =
    servingCount > 0
      ? Math.round((averageDuration + bufferTime) / Math.max(servingCount, 1))
      : 0;

  const estimatedWaitMinutes = Math.max(
    0,
    Math.round(baseWait + currentServiceLoad)
  );

  return {
    estimatedWaitMinutes,
    waitingAhead,
    servingCount,
    calledCount,
    averageServiceMinutes: averageDuration,
    bufferMinutes: bufferTime,
    confidence: queue.length > 0 ? "medium" : "low",
    calculatedAt: new Date().toISOString(),
  };
};

module.exports = {
  calculateWaitPrediction,
};
