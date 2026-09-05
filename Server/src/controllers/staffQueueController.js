const Queue = require("../models/Queue");

const emitQueueUpdate = (req, queue, type) => {
  const io = req.app.get("io");
  if (io) {
    io.to(`business:${queue.business}`).emit("queue:updated", { type, queue });
  }
};

const callNext = async (req, res, next) => {
  try {
    const { businessId, serviceId } = req.body;
    if (!businessId || !serviceId) return res.status(400).json({ success: false, message: "Business and service are required" });

    const current = await Queue.findOne({ business: businessId, service: serviceId, status: { $in: ["CALLED", "SERVING"] } });
    if (current) return res.status(409).json({ success: false, message: "A customer is already being served or called", queue: current });

    const nextCustomer = await Queue.findOne({ business: businessId, service: serviceId, status: "WAITING" }).sort({ priority: -1, joinedAt: 1 });
    if (!nextCustomer) return res.status(404).json({ success: false, message: "No customers are waiting" });

    nextCustomer.status = "CALLED";
    nextCustomer.calledAt = new Date();
    nextCustomer.position = 0;
    nextCustomer.estimatedWaitTime = 0;
    await nextCustomer.save();

    const queue = await Queue.findById(nextCustomer._id).populate("customer", "name email").populate("service", "name averageDuration");
    emitQueueUpdate(req, queue, "CALLED");
    res.json({ success: true, message: "Next customer called", queue });
  } catch (error) { next(error); }
};

const startServing = async (req, res, next) => {
  try {
    const queue = await Queue.findOne({ _id: req.params.id, status: "CALLED" });
    if (!queue) return res.status(404).json({ success: false, message: "Called queue entry not found" });
    queue.status = "SERVING";
    queue.serviceStartedAt = new Date();
    await queue.save();
    emitQueueUpdate(req, queue, "SERVING");
    res.json({ success: true, message: "Service started", queue });
  } catch (error) { next(error); }
};

const completeService = async (req, res, next) => {
  try {
    const queue = await Queue.findOne({ _id: req.params.id, status: "SERVING" });
    if (!queue) return res.status(404).json({ success: false, message: "Serving queue entry not found" });
    queue.status = "COMPLETED";
    queue.completedAt = new Date();
    await queue.save();
    emitQueueUpdate(req, queue, "COMPLETED");
    res.json({ success: true, message: "Service completed", queue });
  } catch (error) { next(error); }
};

const skipQueue = async (req, res, next) => {
  try {
    const queue = await Queue.findOne({ _id: req.params.id, status: { $in: ["WAITING", "CALLED"] } });
    if (!queue) return res.status(404).json({ success: false, message: "Queue entry cannot be skipped" });
    queue.status = "SKIPPED";
    await queue.save();
    emitQueueUpdate(req, queue, "SKIPPED");
    res.json({ success: true, message: "Queue entry skipped", queue });
  } catch (error) { next(error); }
};

const markNoShow = async (req, res, next) => {
  try {
    const queue = await Queue.findOne({ _id: req.params.id, status: "CALLED" });
    if (!queue) return res.status(404).json({ success: false, message: "Called queue entry not found" });
    queue.status = "NO_SHOW";
    await queue.save();
    emitQueueUpdate(req, queue, "NO_SHOW");
    res.json({ success: true, message: "Customer marked as no-show", queue });
  } catch (error) { next(error); }
};

module.exports = { callNext, startServing, completeService, skipQueue, markNoShow };
