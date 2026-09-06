const Queue = require("../models/Queue");
const Department = require("../models/Department");
const ServiceHistory = require("../models/ServiceHistory");
const Appointment = require("../models/Appointment");
const { emitQueueUpdate } = require("../services/queueService");


const callNext = async (req, res, next) => {
  try {
    const { businessId, serviceId, departmentId } = req.body;
    if (!businessId || (!serviceId && !departmentId)) return res.status(400).json({ success: false, message: "Hospital and department are required" });

    let resolvedServiceId = serviceId;
    if (!resolvedServiceId && departmentId) {
      const department = await Department.findOne({ _id: departmentId, hospital: businessId, isActive: true });
      resolvedServiceId = department?.legacyService;
    }
    if (!resolvedServiceId) return res.status(404).json({ success: false, message: "Department is not connected to a queue yet" });

    const current = await Queue.findOne({ business: businessId, service: resolvedServiceId, status: { $in: ["CALLED", "SERVING"] } });
    if (current) return res.status(409).json({ success: false, message: "A customer is already being served or called", queue: current });

    const nextCustomer = await Queue.findOne({ business: businessId, service: resolvedServiceId, status: "WAITING" }).sort({ priority: -1, joinedAt: 1 });
    if (!nextCustomer) return res.status(404).json({ success: false, message: "No customers are waiting" });

    nextCustomer.status = "CALLED";
    nextCustomer.calledAt = new Date();
    nextCustomer.position = 0;
    nextCustomer.estimatedWaitTime = 0;
    await nextCustomer.save();

    const queue = await Queue.findById(nextCustomer._id).populate("customer", "name email").populate("service", "name averageDuration").populate("department", "name code");
    emitQueueUpdate(req.app.get("io"), queue.business?._id || queue.business, queue.service?._id || queue.service, "CALLED");
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
    emitQueueUpdate(req.app.get("io"), queue.business?._id || queue.business, queue.service?._id || queue.service, "SERVING");
    res.json({ success: true, message: "Service started", queue });
  } catch (error) { next(error); }
};

const completeService = async (req, res, next) => {
  try {
    const queue = await Queue.findOne({ _id: req.params.id, status: "SERVING" });
    if (!queue) return res.status(404).json({ success: false, message: "Serving queue entry not found" });
    queue.status = "COMPLETED";
    queue.completedAt = new Date();

    if (queue.serviceStartedAt) {
      const durationMinutes = Math.max(
        (queue.completedAt - queue.serviceStartedAt) / 60000,
        0
      );

      await ServiceHistory.create({
        business: queue.business,
        service: queue.service,
        customer: queue.customer,
        queueEntry: queue._id,
        startedAt: queue.serviceStartedAt,
        completedAt: queue.completedAt,
        durationMinutes: Number(durationMinutes.toFixed(2)),
        dayOfWeek: queue.completedAt.getDay(),
        hourOfDay: queue.completedAt.getHours(),
      });
    }
    await queue.save();

    // If this queue entry came from an appointment, keep the appointment
    // lifecycle in sync with the live queue.
    const linkedAppointment = await Appointment.findOne({ queueEntry: queue._id });
    if (linkedAppointment) {
      linkedAppointment.status = "COMPLETED";
      linkedAppointment.completedAt = queue.completedAt;
      await linkedAppointment.save();
    }

    emitQueueUpdate(req.app.get("io"), queue.business?._id || queue.business, queue.service?._id || queue.service, "COMPLETED");
    if (linkedAppointment) {
      req.app.get("io")?.to(`business:${queue.business}`).emit("appointment:updated", linkedAppointment);
    }
    res.json({ success: true, message: "Service completed", queue, appointment: linkedAppointment || null });
  } catch (error) { next(error); }
};

const skipQueue = async (req, res, next) => {
  try {
    const queue = await Queue.findOne({ _id: req.params.id, status: { $in: ["WAITING", "CALLED"] } });
    if (!queue) return res.status(404).json({ success: false, message: "Queue entry cannot be skipped" });
    queue.status = "SKIPPED";
    await queue.save();
    emitQueueUpdate(req.app.get("io"), queue.business?._id || queue.business, queue.service?._id || queue.service, "SKIPPED");
    res.json({ success: true, message: "Queue entry skipped", queue });
  } catch (error) { next(error); }
};

const markNoShow = async (req, res, next) => {
  try {
    const queue = await Queue.findOne({ _id: req.params.id, status: "CALLED" });
    if (!queue) return res.status(404).json({ success: false, message: "Called queue entry not found" });
    queue.status = "NO_SHOW";
    await queue.save();
    emitQueueUpdate(req.app.get("io"), queue.business?._id || queue.business, queue.service?._id || queue.service, "NO_SHOW");
    res.json({ success: true, message: "Customer marked as no-show", queue });
  } catch (error) { next(error); }
};

module.exports = { callNext, startServing, completeService, skipQueue, markNoShow };
