const Appointment = require("../models/Appointment");
const Queue = require("../models/Queue");
const { emitQueueUpdate } = require("../services/queueService");
const Service = require("../models/Service");

const createAppointment = async (req, res) => {
  try {
    const { businessId, serviceId, appointmentDate, scheduledTime, notes = "" } = req.body;

    if (!businessId || !serviceId || !appointmentDate || !scheduledTime) {
      return res.status(400).json({
        success: false,
        message: "Business, service, date, and time are required",
      });
    }

    const service = await Service.findOne({
      _id: serviceId,
      business: businessId,
      isActive: true,
    });

    if (!service) {
      return res.status(404).json({
        success: false,
        message: "Service not found or inactive",
      });
    }

    const appointment = await Appointment.create({
      business: businessId,
      service: serviceId,
      customer: req.user._id,
      appointmentDate: new Date(appointmentDate),
      scheduledTime,
      notes,
    });

    const populatedAppointment = await Appointment.findById(appointment._id)
      .populate("business", "name category")
      .populate("service", "name averageDuration")
      .populate("customer", "name email");

    return res.status(201).json({
      success: true,
      message: "Appointment created successfully",
      appointment: populatedAppointment,
    });
  } catch (error) {
    console.error("Create appointment error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to create appointment",
    });
  }
};

const getMyAppointments = async (req, res) => {
  try {
    const appointments = await Appointment.find({
      customer: req.user._id,
    })
      .populate("business", "name category")
      .populate("service", "name averageDuration")
      .sort({ appointmentDate: 1, createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: appointments.length,
      appointments,
    });
  } catch (error) {
    console.error("Get appointments error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch appointments",
    });
  }
};

const getBusinessAppointments = async (req, res) => {
  try {
    const { businessId } = req.params;
    const { date } = req.query;

    const filter = { business: businessId };

    if (date) {
      const start = new Date(`${date}T00:00:00`);
      const end = new Date(`${date}T23:59:59.999`);
      filter.appointmentDate = { $gte: start, $lte: end };
    }

    const appointments = await Appointment.find(filter)
      .populate("customer", "name email")
      .populate("service", "name averageDuration")
      .sort({ appointmentDate: 1, scheduledTime: 1 });

    return res.status(200).json({
      success: true,
      count: appointments.length,
      appointments,
    });
  } catch (error) {
    console.error("Get business appointments error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch business appointments",
    });
  }
};

const updateAppointmentStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const allowedStatuses = [
      "SCHEDULED",
      "CONFIRMED",
      "CHECKED_IN",
      "COMPLETED",
      "CANCELLED",
      "NO_SHOW",
    ];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid appointment status",
      });
    }

    const appointment = await Appointment.findById(id);

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: "Appointment not found",
      });
    }

    appointment.status = status;

    if (status === "CHECKED_IN" && !appointment.checkedInAt) {
      appointment.checkedInAt = new Date();

      const existingQueueEntry = await Queue.findOne({
        customer: appointment.customer,
        service: appointment.service,
        status: { $in: ["WAITING", "CALLED", "SERVING"] },
      });

      if (!existingQueueEntry) {
        const latestEntry = await Queue.findOne({
          business: appointment.business,
          service: appointment.service,
        }).sort({ tokenNumber: -1 });

        const tokenNumber = latestEntry ? latestEntry.tokenNumber + 1 : 1;

        const waitingCount = await Queue.countDocuments({
          business: appointment.business,
          service: appointment.service,
          status: "WAITING",
        });

        const service = await Service.findById(appointment.service);

        const queueEntry = await Queue.create({
          business: appointment.business,
          service: appointment.service,
          customer: appointment.customer,
          tokenNumber,
          position: waitingCount + 1,
          estimatedWaitTime:
            (waitingCount + 1) * (service?.averageDuration || 15),
          priority: "HIGH",
          notes: `Appointment check-in: ${appointment._id}`,
        });

        const io = req.app.get("io");await emitQueueUpdate(io, appointment.business, appointment.service, "APPOINTMENT_CHECK_IN");
      }
    }

    if (status === "COMPLETED" && !appointment.completedAt) {
      appointment.completedAt = new Date();
    }

    await appointment.save();

    const populatedAppointment = await Appointment.findById(id)
      .populate("business", "name category")
      .populate("service", "name averageDuration")
      .populate("customer", "name email");

    return res.status(200).json({
      success: true,
      message: `Appointment marked as ${status}`,
      appointment: populatedAppointment,
    });
  } catch (error) {
    console.error("Update appointment status error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update appointment",
    });
  }
};

const cancelMyAppointment = async (req, res) => {
  try {
    const appointment = await Appointment.findOne({
      _id: req.params.id,
      customer: req.user._id,
      status: { $in: ["SCHEDULED", "CONFIRMED"] },
    });

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: "Cancellable appointment not found",
      });
    }

    appointment.status = "CANCELLED";
    await appointment.save();

    return res.status(200).json({
      success: true,
      message: "Appointment cancelled successfully",
      appointment,
    });
  } catch (error) {
    console.error("Cancel appointment error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to cancel appointment",
    });
  }
};

module.exports = {
  createAppointment,
  getMyAppointments,
  getBusinessAppointments,
  updateAppointmentStatus,
  cancelMyAppointment,
};
