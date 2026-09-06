const mongoose = require("mongoose");
const Doctor = require("../models/Doctor");
const Appointment = require("../models/Appointment");
const Queue = require("../models/Queue");
const ServiceHistory = require("../models/ServiceHistory");
const { emitQueueUpdate } = require("../services/queueService");

const dayBounds = (value = new Date()) => {
  const date = new Date(value);
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end };
};

async function getDoctorContext(userId) {
  if (!mongoose.isValidObjectId(userId)) return null;
  return Doctor.findOne({ user: userId, status: { $ne: "INACTIVE" } })
    .populate("user", "name email isActive")
    .populate("department", "name code description averageDuration consultationFee isActive")
    .populate("hospital", "name");
}

const populateQueue = (query) => query
  .populate("customer", "name email")
  .populate({ path: "doctor", populate: { path: "user", select: "name email" } })
  .populate("service", "name averageDuration")
  .populate("department", "name code")
  .sort({ priority: -1, joinedAt: 1 });

exports.getDoctorDashboard = async (req, res) => {
  try {
    const doctor = await getDoctorContext(req.user._id);
    if (!doctor || !doctor.department) {
      return res.status(404).json({ success: false, message: "Doctor profile or department not found." });
    }

    const { start, end } = dayBounds();
    const departmentId = doctor.department._id;

    const [appointments, queue] = await Promise.all([
      Appointment.find({ doctor: doctor._id, department: departmentId, appointmentDate: { $gte: start, $lt: end } })
        .populate("customer", "name email")
        .populate("service", "name averageDuration")
        .populate("queueEntry", "tokenNumber status position estimatedWaitTime")
        .sort({ scheduledTime: 1, createdAt: 1 }),
      populateQueue(Queue.find({
        doctor: doctor._id,
        department: departmentId,
        status: { $in: ["WAITING", "CALLED", "SERVING"] },
      })),
    ]);

    const current = queue.find((entry) => ["CALLED", "SERVING"].includes(entry.status)) || null;
    const waiting = queue.filter((entry) => entry.status === "WAITING");

    res.json({
      success: true,
      doctor,
      stats: {
        appointments: appointments.length,
        checkedIn: appointments.filter((a) => a.status === "CHECKED_IN").length,
        completed: appointments.filter((a) => a.status === "COMPLETED").length,
        waiting: waiting.length,
      },
      current,
      queue,
      appointments,
    });
  } catch (error) {
    console.error("getDoctorDashboard:", error);
    res.status(500).json({ success: false, message: "Failed to load doctor dashboard." });
  }
};

async function requireDoctorQueueEntry(userId, queueId) {
  const doctor = await Doctor.findOne({ user: userId, status: { $ne: "INACTIVE" } }).select("_id hospital department");
  if (!doctor || !mongoose.isValidObjectId(queueId)) return { error: "Doctor or queue entry not found.", status: 404 };
  const queue = await Queue.findOne({ _id: queueId, business: doctor.hospital, doctor: doctor._id, department: doctor.department });
  if (!queue) return { error: "Queue entry does not belong to your department.", status: 403 };
  return { doctor, queue };
}

exports.callNext = async (req, res) => {
  try {
    const doctor = await Doctor.findOne({ user: req.user._id, status: "ACTIVE" }).select("_id hospital department");
    if (!doctor) return res.status(404).json({ success: false, message: "Active doctor profile not found." });

    const current = await Queue.findOne({
      business: doctor.hospital,
      doctor: doctor._id,
      department: doctor.department,
      status: { $in: ["CALLED", "SERVING"] },
    });
    if (current) return res.status(409).json({ success: false, message: "Finish the current patient before calling the next one.", queue: current });

    const next = await Queue.findOne({
      business: doctor.hospital,
      doctor: doctor._id,
      department: doctor.department,
      status: "WAITING",
    }).sort({ priority: -1, joinedAt: 1 });

    if (!next) return res.status(404).json({ success: false, message: "No patients are waiting." });

    next.status = "CALLED";
    next.calledAt = new Date();
    next.position = 0;
    next.estimatedWaitTime = 0;
    await next.save();

    const populated = await populateQueue(Queue.findById(next._id));
    await emitQueueUpdate(req.app.get("io"), doctor.hospital, next.service, "CALLED", { doctorId: doctor._id, departmentId: doctor.department });
    res.json({ success: true, message: `Token #${next.tokenNumber} called.`, queue: populated });
  } catch (error) {
    console.error("doctorCallNext:", error);
    res.status(500).json({ success: false, message: "Failed to call next patient." });
  }
};

exports.startServing = async (req, res) => {
  try {
    const result = await requireDoctorQueueEntry(req.user._id, req.params.id);
    if (result.error) return res.status(result.status).json({ success: false, message: result.error });
    const { queue, doctor } = result;
    if (queue.status !== "CALLED") return res.status(400).json({ success: false, message: "Only a called patient can be started." });
    queue.status = "SERVING";
    queue.serviceStartedAt = new Date();
    await queue.save();
    await emitQueueUpdate(req.app.get("io"), doctor.hospital, queue.service, "SERVING", { doctorId: doctor._id, departmentId: doctor.department });
    res.json({ success: true, message: "Consultation started.", queue });
  } catch (error) {
    console.error("doctorStartServing:", error);
    res.status(500).json({ success: false, message: "Failed to start consultation." });
  }
};

exports.completeService = async (req, res) => {
  try {
    const result = await requireDoctorQueueEntry(req.user._id, req.params.id);
    if (result.error) return res.status(result.status).json({ success: false, message: result.error });
    const { queue, doctor } = result;
    if (queue.status !== "SERVING") return res.status(400).json({ success: false, message: "Only the current patient can be completed." });

    queue.status = "COMPLETED";
    queue.completedAt = new Date();
    if (queue.serviceStartedAt) {
      const durationMinutes = Math.max((queue.completedAt - queue.serviceStartedAt) / 60000, 0);
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

    const appointment = await Appointment.findOne({ queueEntry: queue._id });
    if (appointment) {
      appointment.status = "COMPLETED";
      appointment.completedAt = queue.completedAt;
      await appointment.save();
      req.app.get("io")?.to(`business:${queue.business}`).emit("appointment:updated", appointment);
    }

    await emitQueueUpdate(req.app.get("io"), doctor.hospital, queue.service, "COMPLETED", { doctorId: doctor._id, departmentId: doctor.department });
    res.json({ success: true, message: "Consultation completed.", queue, appointment: appointment || null });
  } catch (error) {
    console.error("doctorCompleteService:", error);
    res.status(500).json({ success: false, message: "Failed to complete consultation." });
  }
};

exports.skipQueue = async (req, res) => {
  try {
    const result = await requireDoctorQueueEntry(req.user._id, req.params.id);
    if (result.error) return res.status(result.status).json({ success: false, message: result.error });
    const { queue, doctor } = result;
    if (!["WAITING", "CALLED"].includes(queue.status)) return res.status(400).json({ success: false, message: "This patient cannot be skipped now." });
    queue.status = "SKIPPED";
    await queue.save();
    await emitQueueUpdate(req.app.get("io"), doctor.hospital, queue.service, "SKIPPED", { doctorId: doctor._id, departmentId: doctor.department });
    res.json({ success: true, message: "Patient skipped.", queue });
  } catch (error) {
    console.error("doctorSkipQueue:", error);
    res.status(500).json({ success: false, message: "Failed to skip patient." });
  }
};

exports.markNoShow = async (req, res) => {
  try {
    const result = await requireDoctorQueueEntry(req.user._id, req.params.id);
    if (result.error) return res.status(result.status).json({ success: false, message: result.error });
    const { queue, doctor } = result;
    if (queue.status !== "CALLED") return res.status(400).json({ success: false, message: "Only a called patient can be marked no-show." });
    queue.status = "NO_SHOW";
    await queue.save();

    const appointment = await Appointment.findOne({ queueEntry: queue._id });
    if (appointment) {
      appointment.status = "NO_SHOW";
      await appointment.save();
    }

    await emitQueueUpdate(req.app.get("io"), doctor.hospital, queue.service, "NO_SHOW", { doctorId: doctor._id, departmentId: doctor.department });
    res.json({ success: true, message: "Patient marked as no-show.", queue, appointment: appointment || null });
  } catch (error) {
    console.error("doctorNoShow:", error);
    res.status(500).json({ success: false, message: "Failed to mark no-show." });
  }
};

exports.updateAppointmentStatus = async (req, res) => {
  try {
    const doctor = await Doctor.findOne({ user: req.user._id, status: "ACTIVE" }).select("_id hospital department");
    if (!doctor) return res.status(404).json({ success: false, message: "Active doctor profile not found." });
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ success: false, message: "Invalid appointment id." });

    const allowed = ["CONFIRMED", "NO_SHOW", "CANCELLED"];
    if (!allowed.includes(req.body.status)) return res.status(400).json({ success: false, message: "Doctor can only confirm, cancel or mark an appointment as no-show." });

    const appointment = await Appointment.findOne({ _id: req.params.id, business: doctor.hospital, department: doctor.department });
    if (!appointment) return res.status(404).json({ success: false, message: "Appointment not found in your department." });
    appointment.status = req.body.status;
    await appointment.save();

    const populated = await Appointment.findById(appointment._id)
      .populate("customer", "name email")
      .populate("service", "name averageDuration")
      .populate("department", "name code")
      .populate("queueEntry", "tokenNumber status position estimatedWaitTime");
    req.app.get("io")?.to(`business:${doctor.hospital}`).emit("appointment:updated", populated);
    res.json({ success: true, message: "Appointment updated.", appointment: populated });
  } catch (error) {
    console.error("doctorUpdateAppointmentStatus:", error);
    res.status(500).json({ success: false, message: "Failed to update appointment." });
  }
};
