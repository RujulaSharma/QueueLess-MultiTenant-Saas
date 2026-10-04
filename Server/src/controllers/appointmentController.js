const mongoose = require("mongoose");
const Appointment = require("../models/Appointment");
const Business = require("../models/Business");
const Service = require("../models/Service");
const Department = require("../models/Department");
const Queue = require("../models/Queue");
const Doctor = require("../models/Doctor");

const ACTIVE_QUEUE_STATUSES = ["WAITING", "CALLED", "SERVING"];

function dayBounds(dateValue = new Date()) {
  const d = new Date(dateValue);
  const start = new Date(d);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end };
}

function emit(io, businessId, event, payload) {
  if (!io || !businessId) return;
  io.to(`business:${businessId}`).emit(event, payload);
}

exports.createAppointment = async (req, res) => {
  try {
    const { businessId, serviceId, departmentId, doctorId, appointmentDate, scheduledTime, notes, customerId } = req.body;

    if (!mongoose.isValidObjectId(businessId)) {
      return res.status(400).json({ success: false, message: "Invalid hospital." });
    }
    if (serviceId && !mongoose.isValidObjectId(serviceId)) {
      return res.status(400).json({ success: false, message: "Invalid service." });
    }
    if (departmentId && !mongoose.isValidObjectId(departmentId)) {
      return res.status(400).json({ success: false, message: "Invalid department." });
    }
    if (doctorId && !mongoose.isValidObjectId(doctorId)) {
      return res.status(400).json({ success: false, message: "Invalid doctor." });
    }
    if (!appointmentDate || !scheduledTime) {
      return res.status(400).json({ success: false, message: "Appointment date and time are required." });
    }

    const business = await Business.findOne({ _id: businessId, isActive: true });
    if (!business) return res.status(404).json({ success: false, message: "Hospital not found." });

    let department = null;
    let service = null;
    if (departmentId) {
      department = await Department.findOne({ _id: departmentId, hospital: businessId, isActive: true });
      if (!department) return res.status(404).json({ success: false, message: "Department not found." });
      if (department.legacyService) service = await Service.findOne({ _id: department.legacyService, business: businessId, isActive: true });
    } else if (serviceId) {
      service = await Service.findOne({ _id: serviceId, business: businessId, isActive: true });
      if (service?.department) department = await Department.findById(service.department);
    }

    if (!service) return res.status(404).json({ success: false, message: "Bookable department not found." });

    let doctor = null;
    if (doctorId) {
      doctor = await Doctor.findOne({ _id: doctorId, hospital: businessId, department: department?._id, status: "ACTIVE" })
        .populate("user", "name email");
      if (!doctor) return res.status(404).json({ success: false, message: "Selected doctor is not available for this department." });
    }

    let customer = req.user._id;
    if (["ADMIN", "STAFF"].includes(req.user.role) && customerId) {
      if (!mongoose.isValidObjectId(customerId)) {
        return res.status(400).json({ success: false, message: "Invalid customer ID." });
      }
      const User = require("../models/User");
      const targetCustomer = await User.findOne({
        _id: customerId,
        role: "CUSTOMER",
        isActive: true,
        businessId,
      }).select("_id");
      if (!targetCustomer) {
        return res.status(404).json({ success: false, message: "Customer not found for this business." });
      }
      customer = targetCustomer._id;
    }

    const duplicateQuery = {
      business: businessId,
      appointmentDate: new Date(appointmentDate),
      scheduledTime,
      status: { $nin: ["CANCELLED", "NO_SHOW"] },
    };
    if (doctor?._id) {
      duplicateQuery.doctor = doctor._id;
    } else if (department?._id || service.department) {
      duplicateQuery.department = department?._id || service.department;
    }

    const duplicate = await Appointment.findOne(duplicateQuery);
    if (duplicate) {
      return res.status(409).json({ success: false, message: "That doctor or slot is already booked for this time. Please choose another slot." });
    }

    const appointment = await Appointment.create({
      business: businessId,
      doctor: doctor?._id || null,
      department: department?._id || service.department || null,
      service: service._id,
      customer,
      appointmentDate: new Date(appointmentDate),
      scheduledTime,
      notes: notes || "",
      status: "CONFIRMED",
    });

    const populated = await Appointment.findById(appointment._id)
      .populate("business", "name category address")
      .populate("service", "name averageDuration")
      .populate("department", "name code")
      .populate({ path: "doctor", populate: { path: "user", select: "name email" } })
      .populate("customer", "name email");

    emit(req.app.get("io"), businessId, "appointment:created", populated);

    return res.status(201).json({
      success: true,
      message: "Appointment booked successfully.",
      appointment: populated,
    });
  } catch (error) {
    console.error("createAppointment:", error);
    return res.status(500).json({ success: false, message: "Failed to create appointment." });
  }
};

exports.getMyAppointments = async (req, res) => {
  try {
    const appointments = await Appointment.find({ customer: req.user._id })
      .populate("business", "name category address")
      .populate("service", "name averageDuration")
      .populate("department", "name code")
      .populate({ path: "doctor", populate: { path: "user", select: "name email" } })
      .populate("queueEntry", "tokenNumber status position estimatedWaitTime")
      .sort({ appointmentDate: 1, scheduledTime: 1, createdAt: -1 });

    return res.json({ success: true, appointments });
  } catch (error) {
    console.error("getMyAppointments:", error);
    return res.status(500).json({ success: false, message: "Failed to load appointments." });
  }
};

exports.getAppointmentById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "Invalid appointment ID." });
    }

    const appointment = await Appointment.findById(id)
      .populate("business", "name category address phone email")
      .populate("service", "name averageDuration price")
      .populate("department", "name code description averageDuration consultationFee")
      .populate({ path: "doctor", populate: { path: "user", select: "name email" } })
      .populate("customer", "name email")
      .populate("queueEntry", "tokenNumber status position estimatedWaitTime joinedAt calledAt serviceStartedAt completedAt");

    if (!appointment) {
      return res.status(404).json({ success: false, message: "Appointment not found." });
    }

    if (req.user.role === "CUSTOMER") {
      if (String(appointment.customer?._id || appointment.customer) !== String(req.user._id)) {
        return res.status(403).json({ success: false, message: "You do not have permission to view this appointment." });
      }
    } else if (req.user.role === "DOCTOR") {
      const doctor = await Doctor.findOne({ user: req.user._id });
      if (!doctor || (appointment.doctor && String(appointment.doctor?._id || appointment.doctor) !== String(doctor._id))) {
        return res.status(403).json({ success: false, message: "You do not have permission to view this appointment." });
      }
    } else if (["ADMIN", "STAFF"].includes(req.user.role)) {
      if (req.user.businessId && String(appointment.business?._id || appointment.business) !== String(req.user.businessId)) {
        return res.status(403).json({ success: false, message: "You do not have permission to view this appointment." });
      }
    }

    return res.json({ success: true, appointment });
  } catch (error) {
    console.error("getAppointmentById:", error);
    return res.status(500).json({ success: false, message: "Failed to load appointment details." });
  }
};

exports.getBusinessAppointments = async (req, res) => {
  try {
    const businessId = req.user.businessId;
    if (!businessId || !mongoose.isValidObjectId(businessId)) {
      return res.status(400).json({ success: false, message: "Your account is not connected to a hospital." });
    }

    const filter = { business: businessId };
    if (req.query.date) {
      const { start, end } = dayBounds(req.query.date);
      filter.appointmentDate = { $gte: start, $lt: end };
    }

    const appointments = await Appointment.find(filter)
      .populate("customer", "name email")
      .populate("service", "name averageDuration")
      .populate("department", "name code")
      .populate({ path: "doctor", populate: { path: "user", select: "name email" } })
      .populate("queueEntry", "tokenNumber status position estimatedWaitTime")
      .sort({ appointmentDate: 1, scheduledTime: 1, createdAt: 1 });

    return res.json({ success: true, appointments });
  } catch (error) {
    console.error("getBusinessAppointments:", error);
    return res.status(500).json({ success: false, message: "Failed to load business appointments." });
  }
};

async function createQueueEntryForAppointment(appointment, io) {
  if (appointment.queueEntry) {
    const existing = await Queue.findById(appointment.queueEntry);
    if (existing) return existing;
  }

  const activeExisting = await Queue.findOne({
    business: appointment.business,
    doctor: appointment.doctor || null,
    department: appointment.department || null,
    service: appointment.service,
    customer: appointment.customer,
    status: { $in: ACTIVE_QUEUE_STATUSES },
  });

  if (activeExisting) {
    appointment.queueEntry = activeExisting._id;
    appointment.status = "CHECKED_IN";
    appointment.checkedInAt = new Date();
    await appointment.save();
    return activeExisting;
  }

  const tokenScope = {
    business: appointment.business,
    doctor: appointment.doctor || null,
    department: appointment.department || null,
    service: appointment.service,
  };

  const lastToken = await Queue.findOne(tokenScope)
    .sort({ tokenNumber: -1 })
    .select("tokenNumber");

  const service = await Service.findById(appointment.service).select("averageDuration");
  const waitingCount = await Queue.countDocuments({
    business: appointment.business,
    doctor: appointment.doctor || null,
    department: appointment.department || null,
    service: appointment.service,
    status: { $in: ACTIVE_QUEUE_STATUSES },
  });

  const queueEntry = await Queue.create({
    business: appointment.business,
    doctor: appointment.doctor || null,
    department: appointment.department || null,
    service: appointment.service,
    customer: appointment.customer,
    tokenNumber: (lastToken?.tokenNumber || 0) + 1,
    status: "WAITING",
    priority: "HIGH",
    position: waitingCount + 1,
    estimatedWaitTime: (waitingCount + 1) * Number(service?.averageDuration || 15),
    notes: `Appointment check-in: ${appointment._id}`,
  });

  appointment.queueEntry = queueEntry._id;
  appointment.status = "CHECKED_IN";
  appointment.checkedInAt = new Date();
  await appointment.save();

  emit(io, appointment.business, "queue:updated", {
    reason: "appointment_checked_in",
    businessId: appointment.business,
    doctorId: appointment.doctor || null,
    departmentId: appointment.department || null,
    queueEntry,
  });
  emit(io, appointment.business, "appointment:updated", {
    businessId: appointment.business,
    appointment,
    queueEntry,
  });

  return queueEntry;
}

exports.checkInAppointment = async (req, res) => {
  try {
    const appointment = await Appointment.findOne({
      _id: req.params.id,
      customer: req.user._id,
    });

    if (!appointment) {
      return res.status(404).json({ success: false, message: "Appointment not found." });
    }

    if (appointment.status === "CHECKED_IN" && appointment.queueEntry) {
      const existing = await Queue.findById(appointment.queueEntry)
        .populate("service", "name averageDuration");
      return res.json({ success: true, message: "Already checked in.", appointment, queueEntry: existing });
    }

    if (!["SCHEDULED", "CONFIRMED"].includes(appointment.status)) {
      return res.status(400).json({
        success: false,
        message: `Appointment cannot be checked in from ${appointment.status} status.`,
      });
    }

    const now = new Date();
    const appointmentDay = new Date(appointment.appointmentDate);
    appointmentDay.setHours(0, 0, 0, 0);
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);

    if (appointmentDay.getTime() !== today.getTime()) {
      return res.status(400).json({
        success: false,
        message: "Check-in is available on the appointment date.",
      });
    }

    const queueEntry = await createQueueEntryForAppointment(
      appointment,
      req.app.get("io")
    );

    const populated = await Queue.findById(queueEntry._id)
      .populate("service", "name averageDuration")
      .populate("customer", "name email");

    return res.json({
      success: true,
      message: "Checked in successfully. You are now in the live queue.",
      appointment,
      queueEntry: populated,
    });
  } catch (error) {
    console.error("checkInAppointment:", error);
    return res.status(500).json({ success: false, message: "Failed to check in." });
  }
};

exports.updateAppointmentStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const allowed = ["SCHEDULED", "CONFIRMED", "CHECKED_IN", "COMPLETED", "CANCELLED", "NO_SHOW"];

    if (!allowed.includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid appointment status." });
    }

    const filter = { _id: req.params.id };
    if (req.user.businessId) filter.business = req.user.businessId;

    const appointment = await Appointment.findOne(filter);
    if (!appointment) {
      return res.status(404).json({ success: false, message: "Appointment not found." });
    }

    if (status === "CHECKED_IN") {
      const queueEntry = await createQueueEntryForAppointment(appointment, req.app.get("io"));
      const populated = await Appointment.findById(appointment._id)
        .populate("customer", "name email")
        .populate("service", "name averageDuration")
        .populate("department", "name code")
        .populate({ path: "doctor", populate: { path: "user", select: "name email" } })
        .populate("queueEntry", "tokenNumber status position estimatedWaitTime");

      emit(req.app.get("io"), appointment.business, "appointment:updated", populated);

      return res.json({ success: true, appointment: populated, queueEntry });
    }

    appointment.status = status;
    if (status === "COMPLETED") appointment.completedAt = new Date();

    await appointment.save();

    const populated = await Appointment.findById(appointment._id)
      .populate("customer", "name email")
      .populate("service", "name averageDuration")
      .populate("department", "name code")
      .populate({ path: "doctor", populate: { path: "user", select: "name email" } })
      .populate("queueEntry", "tokenNumber status position estimatedWaitTime");

    emit(req.app.get("io"), appointment.business, "appointment:updated", populated);

    return res.json({ success: true, appointment: populated });
  } catch (error) {
    console.error("updateAppointmentStatus:", error);
    return res.status(500).json({ success: false, message: "Failed to update appointment." });
  }
};

exports.cancelMyAppointment = async (req, res) => {
  try {
    const appointment = await Appointment.findOne({
      _id: req.params.id,
      customer: req.user._id,
    });

    if (!appointment) {
      return res.status(404).json({ success: false, message: "Appointment not found." });
    }

    appointment.status = "CANCELLED";
    await appointment.save();

    if (appointment.queueEntry) {
      const queueEntry = await Queue.findById(appointment.queueEntry);
      if (queueEntry) {
        queueEntry.status = "CANCELLED";
        await queueEntry.save();
      }
    }

    emit(req.app.get("io"), appointment.business, "appointment:updated", {
      businessId: appointment.business,
      appointment,
    });
    if (appointment.queueEntry) {
      const queueEntry = await Queue.findById(appointment.queueEntry);
      if (queueEntry) {
        const { emitQueueUpdate } = require("../services/queueService");
        await emitQueueUpdate(req.app.get("io"), queueEntry.business, queueEntry.service, "APPOINTMENT_CANCELLED", { doctorId: queueEntry.doctor, departmentId: queueEntry.department });
      }
    }
    return res.json({ success: true, message: "Appointment cancelled.", appointment });
  } catch (error) {
    console.error("cancelMyAppointment:", error);
    return res.status(500).json({ success: false, message: "Failed to cancel appointment." });
  }
};
