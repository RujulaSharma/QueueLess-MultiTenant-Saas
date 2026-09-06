const mongoose = require("mongoose");
const Business = require("../models/Business");
const Department = require("../models/Department");
const Doctor = require("../models/Doctor");
const Service = require("../models/Service");
const Appointment = require("../models/Appointment");
const Queue = require("../models/Queue");

const getAdminHospital = async (user) => {
  if (!user?._id) return null;
  let hospital = null;
  if (user.businessId && mongoose.isValidObjectId(user.businessId)) {
    hospital = await Business.findOne({ _id: user.businessId, owner: user._id, isActive: true });
  }
  if (!hospital) {
    hospital = await Business.findOne({ owner: user._id, isActive: true });
    if (hospital) {
      await mongoose.model("User").findByIdAndUpdate(user._id, { businessId: hospital._id, role: "ADMIN" });
      user.businessId = hospital._id;
      user.role = "ADMIN";
    }
  }
  return hospital;
};

const listDepartments = async (req, res) => {
  try {
    const hospital = await getAdminHospital(req.user);
    if (!hospital) return res.status(403).json({ success: false, message: "Hospital access not found." });

    const departments = await Department.find({ hospital: hospital._id })
      .populate({ path: "ownerDoctor", populate: { path: "user", select: "name email isActive" } })
      .populate("legacyService", "name averageDuration price isActive")
      .sort({ isActive: -1, name: 1 })
      .lean();

    const ids = departments.map((d) => d._id);
    const [appointmentCounts, queueCounts] = await Promise.all([
      Appointment.aggregate([
        { $match: { business: hospital._id, ...(ids.length ? { department: { $in: ids } } : {}) } },
        { $group: { _id: "$department", count: { $sum: 1 } } },
      ]),
      Queue.aggregate([
        { $match: { business: hospital._id, status: { $in: ["WAITING", "CALLED", "SERVING"] }, ...(ids.length ? { department: { $in: ids } } : {}) } },
        { $group: { _id: "$department", count: { $sum: 1 } } },
      ]),
    ]);

    const appointmentMap = new Map(appointmentCounts.map((x) => [String(x._id), x.count]));
    const queueMap = new Map(queueCounts.map((x) => [String(x._id), x.count]));

    res.json({
      success: true,
      hospital: { _id: hospital._id, name: hospital.name },
      departments: departments.map((d) => ({
        ...d,
        appointmentCount: appointmentMap.get(String(d._id)) || 0,
        queueCount: queueMap.get(String(d._id)) || 0,
      })),
    });
  } catch (error) {
    console.error("listDepartments:", error);
    res.status(500).json({ success: false, message: "Failed to load departments." });
  }
};

const listPublicDepartments = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ success: false, message: "Invalid hospital id." });

    const departments = await Department.find({ hospital: id, isActive: true })
      .populate({
        path: "ownerDoctor",
        select: "specialization experienceYears consultationFee status",
        populate: { path: "user", select: "name" },
      })
      .sort({ name: 1 });

    res.json({ success: true, count: departments.length, departments });
  } catch (error) {
    console.error("listPublicDepartments:", error);
    res.status(500).json({ success: false, message: "Failed to load departments." });
  }
};

const createDepartment = async (req, res) => {
  try {
    const hospital = await getAdminHospital(req.user);
    if (!hospital) return res.status(403).json({ success: false, message: "Hospital access not found." });

    const { name, code, description, averageDuration, consultationFee } = req.body;
    if (!name?.trim() || !code?.trim()) {
      return res.status(400).json({ success: false, message: "Department name and code are required." });
    }

    const department = await Department.create({
      hospital: hospital._id,
      name: name.trim(),
      code: code.trim().toUpperCase(),
      description: description || "",
      averageDuration: Number(averageDuration) || 15,
      consultationFee: Number(consultationFee) || 0,
    });

    const service = await Service.create({
      business: hospital._id,
      name: department.name,
      description: department.description,
      averageDuration: department.averageDuration,
      price: department.consultationFee,
      isActive: true,
    });

    department.legacyService = service._id;
    await department.save();

    res.status(201).json({ success: true, message: "Department created successfully.", department });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ success: false, message: "A department with this name or code already exists." });
    console.error("createDepartment:", error);
    res.status(500).json({ success: false, message: "Failed to create department." });
  }
};

const updateDepartment = async (req, res) => {
  try {
    const hospital = await getAdminHospital(req.user);
    if (!hospital) return res.status(403).json({ success: false, message: "Hospital access not found." });
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ success: false, message: "Invalid department id." });

    const department = await Department.findOne({ _id: req.params.id, hospital: hospital._id });
    if (!department) return res.status(404).json({ success: false, message: "Department not found." });

    const { name, code, description, averageDuration, consultationFee } = req.body;
    if (name !== undefined) department.name = String(name).trim();
    if (code !== undefined) department.code = String(code).trim().toUpperCase();
    if (description !== undefined) department.description = description;
    if (averageDuration !== undefined) department.averageDuration = Number(averageDuration);
    if (consultationFee !== undefined) department.consultationFee = Number(consultationFee);
    await department.save();

    if (department.legacyService) {
      await Service.findByIdAndUpdate(department.legacyService, {
        name: department.name,
        description: department.description,
        averageDuration: department.averageDuration,
        price: department.consultationFee,
      });
    }

    res.json({ success: true, message: "Department updated successfully.", department });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ success: false, message: "A department with this name or code already exists." });
    console.error("updateDepartment:", error);
    res.status(500).json({ success: false, message: "Failed to update department." });
  }
};

const toggleDepartment = async (req, res) => {
  try {
    const hospital = await getAdminHospital(req.user);
    if (!hospital) return res.status(403).json({ success: false, message: "Hospital access not found." });
    const department = await Department.findOne({ _id: req.params.id, hospital: hospital._id });
    if (!department) return res.status(404).json({ success: false, message: "Department not found." });
    department.isActive = !department.isActive;
    await department.save();
    if (department.legacyService) await Service.findByIdAndUpdate(department.legacyService, { isActive: department.isActive });
    res.json({ success: true, message: department.isActive ? "Department activated." : "Department deactivated.", department });
  } catch (error) {
    console.error("toggleDepartment:", error);
    res.status(500).json({ success: false, message: "Failed to update department status." });
  }
};

module.exports = { listDepartments, listPublicDepartments, createDepartment, updateDepartment, toggleDepartment };
