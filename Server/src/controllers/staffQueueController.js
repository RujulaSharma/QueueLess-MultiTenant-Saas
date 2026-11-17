const mongoose = require("mongoose");
const Queue = require("../models/Queue");
const Department = require("../models/Department");
const ServiceHistory = require("../models/ServiceHistory");
const Appointment = require("../models/Appointment");
const { emitQueueUpdate } = require("../services/queueService");

const getStaffBusinessId = (user) => {
  return user?.businessId || null;
};

const callNext = async (req, res, next) => {
  try {
    const businessId = getStaffBusinessId(req.user);
    const { serviceId, departmentId, doctorId } = req.body;

    if (!businessId || !mongoose.isValidObjectId(businessId)) {
      return res.status(400).json({ success: false, message: "Valid hospital is required" });
    }

    if (req.user.businessId && String(req.user.businessId) !== String(businessId)) {
      return res.status(403).json({ success: false, message: "You do not have access to this hospital queue" });
    }

    if (!serviceId && !departmentId) {
      return res.status(400).json({ success: false, message: "Department or service is required" });
    }

    let resolvedServiceId = serviceId;
    if (!resolvedServiceId && departmentId) {
      const department = await Department.findOne({ _id: departmentId, hospital: businessId, isActive: true });
      resolvedServiceId = department?.legacyService;
    }
    if (!resolvedServiceId) {
      return res.status(404).json({ success: false, message: "Department is not connected to a queue yet" });
    }

    if (doctorId != null && !mongoose.isObjectIdOrHexString(doctorId)) {
      return res.status(400).json({ success: false, message: "Invalid doctor." });
    }
    const scope = {
      business: businessId,
      service: resolvedServiceId,
      ...(doctorId !== undefined ? { doctor: doctorId } : {}),
    };
    const current = await Queue.findOne({ ...scope, status: { $in: ["CALLED", "SERVING"] } });
    if (current) {
      return res.status(409).json({ success: false, message: "A customer is already being served or called", queue: current });
    }

    const nextCustomer = await Queue.findOne({ ...scope, status: "WAITING" }).sort({ priority: 1, joinedAt: 1, _id: 1 });
    if (!nextCustomer) {
      return res.status(404).json({ success: false, message: "No customers are waiting" });
    }

    const claimed = await Queue.updateOne(
      { _id: nextCustomer._id, business: businessId, status: "WAITING" },
      { $set: { status: "CALLED", calledAt: new Date(), position: 0, estimatedWaitTime: 0 } }
    );
    if (!claimed.modifiedCount) return res.status(409).json({ success: false, message: "The queue changed. Refresh and try again." });

    const queue = await Queue.findById(nextCustomer._id)
      .populate("customer", "name email")
      .populate("service", "name averageDuration")
      .populate("department", "name code")
      .populate({ path: "doctor", populate: { path: "user", select: "name email" } });

    await emitQueueUpdate(req.app.get("io"), queue.business?._id || queue.business, queue.service?._id || queue.service, "CALLED", {
      doctorId: queue.doctor?._id || queue.doctor,
      departmentId: queue.department?._id || queue.department,
    });

    res.json({ success: true, message: "Next customer called", queue });
  } catch (error) { next(error); }
};

const startServing = async (req, res, next) => {
  try {
    const businessId = getStaffBusinessId(req.user);
    const filter = { _id: req.params.id, status: "CALLED" };
    if (!businessId) return res.status(403).json({ success: false, message: "Hospital assignment required." });
    filter.business = businessId;

    const queue = await Queue.findOne(filter);
    if (!queue) return res.status(404).json({ success: false, message: "Called queue entry not found" });

    queue.status = "SERVING";
    queue.serviceStartedAt = new Date();
    await queue.save();

    await emitQueueUpdate(req.app.get("io"), queue.business?._id || queue.business, queue.service?._id || queue.service, "SERVING", {
      doctorId: queue.doctor,
      departmentId: queue.department,
    });

    res.json({ success: true, message: "Service started", queue });
  } catch (error) { next(error); }
};

const completeService = async (req, res, next) => {
  try {
    const businessId = getStaffBusinessId(req.user);
    const filter = { _id: req.params.id, status: "SERVING" };
    if (!businessId) return res.status(403).json({ success: false, message: "Hospital assignment required." });
    filter.business = businessId;

    const queue = await Queue.findOne(filter);
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

    const linkedAppointment = await Appointment.findOne({ queueEntry: queue._id, business: queue.business });
    if (linkedAppointment) {
      linkedAppointment.status = "COMPLETED";
      linkedAppointment.completedAt = queue.completedAt;
      await linkedAppointment.save();
    }

    await emitQueueUpdate(req.app.get("io"), queue.business?._id || queue.business, queue.service?._id || queue.service, "COMPLETED", {
      doctorId: queue.doctor,
      departmentId: queue.department,
    });

    if (linkedAppointment) {
      req.app.get("io")?.to(`business:${queue.business}`).emit("appointment:updated", { businessId: queue.business });
    }
    res.json({ success: true, message: "Service completed", queue, appointment: linkedAppointment || null });
  } catch (error) { next(error); }
};

const skipQueue = async (req, res, next) => {
  try {
    const businessId = getStaffBusinessId(req.user);
    const filter = { _id: req.params.id, status: { $in: ["WAITING", "CALLED"] } };
    if (!businessId) return res.status(403).json({ success: false, message: "Hospital assignment required." });
    filter.business = businessId;

    const queue = await Queue.findOne(filter);
    if (!queue) return res.status(404).json({ success: false, message: "Queue entry cannot be skipped" });

    queue.status = "SKIPPED";
    await queue.save();

    await emitQueueUpdate(req.app.get("io"), queue.business?._id || queue.business, queue.service?._id || queue.service, "SKIPPED", {
      doctorId: queue.doctor,
      departmentId: queue.department,
    });

    res.json({ success: true, message: "Queue entry skipped", queue });
  } catch (error) { next(error); }
};

const markNoShow = async (req, res, next) => {
  try {
    const businessId = getStaffBusinessId(req.user);
    const filter = { _id: req.params.id, status: "CALLED" };
    if (!businessId) return res.status(403).json({ success: false, message: "Hospital assignment required." });
    filter.business = businessId;

    const queue = await Queue.findOne(filter);
    if (!queue) return res.status(404).json({ success: false, message: "Called queue entry not found" });

    queue.status = "NO_SHOW";
    await queue.save();

    const linkedAppointment = await Appointment.findOne({ queueEntry: queue._id, business: queue.business });
    if (linkedAppointment) {
      linkedAppointment.status = "NO_SHOW";
      await linkedAppointment.save();
    }

    await emitQueueUpdate(req.app.get("io"), queue.business?._id || queue.business, queue.service?._id || queue.service, "NO_SHOW", {
      doctorId: queue.doctor,
      departmentId: queue.department,
    });

    res.json({ success: true, message: "Customer marked as no-show", queue, appointment: linkedAppointment || null });
  } catch (error) { next(error); }
};

module.exports = { callNext, startServing, completeService, skipQueue, markNoShow };
