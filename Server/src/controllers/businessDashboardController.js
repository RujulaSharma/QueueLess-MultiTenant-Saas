const mongoose = require("mongoose");
const Business = require("../models/Business");
const User = require("../models/User");
const Service = require("../models/Service");
const Department = require("../models/Department");
const Doctor = require("../models/Doctor");
const Queue = require("../models/Queue");
const Appointment = require("../models/Appointment");

const startOfDay = (date = new Date()) => {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  return value;
};

const getBusinessDashboard = async (req, res, next) => {
  try {
    let businessId = req.user?.businessId;
    if (!businessId || !mongoose.Types.ObjectId.isValid(businessId)) {
      const ownedBusiness = await Business.findOne({ owner: req.user?._id, isActive: true }).select("_id");
      if (ownedBusiness) {
        businessId = ownedBusiness._id;
        await User.findByIdAndUpdate(req.user._id, { businessId: ownedBusiness._id, ...(req.user.role === "STAFF" ? { role: "ADMIN" } : {}) });
      } else {
        return res.status(400).json({ success: false, message: "Your account is not connected to a hospital" });
      }
    }

    const todayStart = startOfDay();
    const tomorrow = new Date(todayStart);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const sevenDaysAgo = new Date(todayStart);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    const thirtyDaysAgo = new Date(todayStart);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29);

    const [business, services, departments, doctorCount, activeDoctorCount, customerCount, activeQueue, todayAppointments, recentAppointments, doctors] =
      await Promise.all([
        Business.findById(businessId).select("name description category address phone email openingHours isActive"),
        Service.find({ business: businessId }).sort({ isActive: -1, name: 1 }),
        Department.find({ hospital: businessId })
          .populate({ path: "ownerDoctor", populate: { path: "user", select: "name email isActive" } })
          .sort({ isActive: -1, name: 1 }),
        Doctor.countDocuments({ hospital: businessId }),
        Doctor.countDocuments({ hospital: businessId, status: "ACTIVE" }),
        User.countDocuments({ businessId, role: "CUSTOMER", isActive: true }),
        Queue.find({ business: businessId, status: { $in: ["WAITING", "CALLED", "SERVING"] } })
          .populate("customer", "name email")
          .populate("service", "name averageDuration price")
          .populate("department", "name code")
          .populate({ path: "doctor", populate: { path: "user", select: "name" } })
          .sort({ status: 1, priority: -1, joinedAt: 1 })
          .limit(50),
        Appointment.find({ business: businessId, appointmentDate: { $gte: todayStart, $lt: tomorrow } })
          .populate("customer", "name email")
          .populate("service", "name averageDuration price")
          .populate("department", "name code")
          .populate({ path: "doctor", populate: { path: "user", select: "name" } })
          .populate("queueEntry", "tokenNumber status position estimatedWaitTime")
          .sort({ scheduledTime: 1 }),
        Appointment.find({ business: businessId, appointmentDate: { $gte: thirtyDaysAgo, $lt: tomorrow } })
          .populate("service", "name price")
          .populate("department", "name code")
          .populate({ path: "doctor", populate: { path: "user", select: "name" } })
          .select("appointmentDate scheduledTime status service department doctor customer createdAt")
          .sort({ appointmentDate: -1, scheduledTime: 1 })
          .limit(1000),
        Doctor.find({ hospital: businessId })
          .populate("user", "name email isActive")
          .populate("department", "name code")
          .sort({ status: 1, createdAt: -1 }),
      ]);

    if (!business) return res.status(404).json({ success: false, message: "Business not found" });

    const countStatuses = (items) => items.reduce((acc, item) => {
      const status = String(item.status || "SCHEDULED").toUpperCase();
      acc.total += 1;
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, { total: 0 });

    const todayCounts = countStatuses(todayAppointments);
    const activeQueueCount = activeQueue.length;
    const completedToday = todayCounts.COMPLETED || 0;
    const pendingToday = todayAppointments.filter((a) => ["SCHEDULED", "CONFIRMED", "CHECKED_IN"].includes(a.status)).length;
    const cancelledToday = todayCounts.CANCELLED || 0;
    const noShowsToday = todayCounts.NO_SHOW || 0;

    const appointmentRevenue = (appointment) => {
      const value = Number(appointment?.service?.price);
      return Number.isFinite(value) ? value : 0;
    };
    const todayRevenue = todayAppointments
      .filter((a) => a.status === "COMPLETED")
      .reduce((sum, a) => sum + appointmentRevenue(a), 0);
    const thirtyDayRevenue = recentAppointments
      .filter((a) => a.status === "COMPLETED")
      .reduce((sum, a) => sum + appointmentRevenue(a), 0);

    const uniqueTodayPatients = new Set(
      todayAppointments.map((a) => a.customer?._id?.toString()).filter(Boolean)
    ).size;

    const departmentMap = new Map();
    departments.forEach((department) => {
      departmentMap.set(String(department._id), {
        ...department.toObject(),
        appointmentCount: 0,
        completedCount: 0,
        waitingCount: 0,
        activeCount: 0,
        revenue: 0,
        doctorCount: 0,
      });
    });
    doctors.forEach((doctor) => {
      const row = departmentMap.get(String(doctor.department?._id || doctor.department));
      if (row) row.doctorCount += 1;
    });
    todayAppointments.forEach((appointment) => {
      const row = departmentMap.get(String(appointment.department?._id || appointment.department));
      if (!row) return;
      row.appointmentCount += 1;
      if (appointment.status === "COMPLETED") {
        row.completedCount += 1;
        row.revenue += appointmentRevenue(appointment);
      }
    });
    activeQueue.forEach((entry) => {
      const row = departmentMap.get(String(entry.department?._id || entry.department));
      if (!row) return;
      if (entry.status === "WAITING") row.waitingCount += 1;
      if (["CALLED", "SERVING"].includes(entry.status)) row.activeCount += 1;
    });

    const doctorMap = new Map();
    doctors.forEach((doctor) => {
      doctorMap.set(String(doctor._id), {
        id: doctor._id,
        name: doctor.user?.name || "Doctor",
        email: doctor.user?.email || "",
        designation: doctor.designation || "Consultant",
        specialization: doctor.specialization || "",
        status: doctor.status,
        department: doctor.department?.name || "Unassigned",
        departmentCode: doctor.department?.code || "",
        appointments: 0,
        completed: 0,
        activeQueue: 0,
        revenue: 0,
      });
    });
    todayAppointments.forEach((appointment) => {
      const row = doctorMap.get(String(appointment.doctor?._id || appointment.doctor));
      if (!row) return;
      row.appointments += 1;
      if (appointment.status === "COMPLETED") {
        row.completed += 1;
        row.revenue += appointmentRevenue(appointment);
      }
    });
    activeQueue.forEach((entry) => {
      const row = doctorMap.get(String(entry.doctor?._id || entry.doctor));
      if (row) row.activeQueue += 1;
    });

    const dayMap = new Map();
    for (let i = 0; i < 7; i += 1) {
      const date = new Date(sevenDaysAgo);
      date.setDate(sevenDaysAgo.getDate() + i);
      dayMap.set(date.toISOString().slice(0, 10), { date: date.toISOString().slice(0, 10), appointments: 0, completed: 0, cancelled: 0, revenue: 0 });
    }
    recentAppointments.forEach((appointment) => {
      const key = startOfDay(appointment.appointmentDate).toISOString().slice(0, 10);
      const row = dayMap.get(key);
      if (!row) return;
      row.appointments += 1;
      if (appointment.status === "COMPLETED") {
        row.completed += 1;
        row.revenue += appointmentRevenue(appointment);
      }
      if (appointment.status === "CANCELLED") row.cancelled += 1;
    });

    const upcoming = todayAppointments.filter((a) => ["SCHEDULED", "CONFIRMED", "CHECKED_IN"].includes(a.status)).slice(0, 8);

    res.json({
      success: true,
      dashboard: {
        business,
        customerCount,
        serviceCount: services.length,
        activeServices: services.filter((service) => service.isActive).length,
        departmentCount: departments.length,
        doctorCount,
        activeDoctorCount,
        departments: Array.from(departmentMap.values()),
        doctors: Array.from(doctorMap.values()),
        activeQueue,
        todayAppointments,
        upcomingAppointments: upcoming,
        appointmentCounts: {
          total: todayAppointments.length,
          completed: completedToday,
          pending: pendingToday,
          cancelled: cancelledToday,
          noShows: noShowsToday,
          confirmed: todayCounts.CONFIRMED || 0,
          checkedIn: todayCounts.CHECKED_IN || 0,
        },
        queueCounts: {
          total: activeQueueCount,
          waiting: activeQueue.filter((q) => q.status === "WAITING").length,
          called: activeQueue.filter((q) => q.status === "CALLED").length,
          serving: activeQueue.filter((q) => q.status === "SERVING").length,
        },
        revenue: {
          today: todayRevenue,
          last30Days: thirtyDayRevenue,
        },
        uniqueTodayPatients,
        weeklyVolume: Array.from(dayMap.values()),
        services,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getBusinessDashboard };
