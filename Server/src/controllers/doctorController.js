const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");
const Business = require("../models/Business");
const User = require("../models/User");
const Doctor = require("../models/Doctor");
const Department = require("../models/Department");


const listPublicDoctors = async (req, res) => {
  try {
    const { departmentId } = req.query;
    if (!mongoose.isValidObjectId(departmentId)) {
      return res.status(400).json({ success: false, message: "Valid department is required." });
    }
    const doctors = await Doctor.find({ department: departmentId, status: "ACTIVE" })
      .populate("user", "name email")
      .populate("department", "name code")
      .select("user department designation specialization experienceYears consultationFee status");
    res.json({ success: true, doctors });
  } catch (error) {
    console.error("listPublicDoctors:", error);
    res.status(500).json({ success: false, message: "Failed to load doctors." });
  }
};

const getDoctorAvailability = async (req, res) => {
  try {
    const { doctorId, date } = req.query;
    if (!mongoose.isValidObjectId(doctorId) || !date) {
      return res.status(400).json({ success: false, message: "Doctor and date are required." });
    }
    const doctor = await Doctor.findOne({ _id: doctorId, status: "ACTIVE" });
    if (!doctor) return res.status(404).json({ success: false, message: "Doctor not found." });
    const start = new Date(`${date}T00:00:00`);
    if (Number.isNaN(start.getTime())) return res.status(400).json({ success: false, message: "Invalid date." });
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    const Appointment = require("../models/Appointment");
    const appointments = await Appointment.find({
      doctor: doctor._id,
      appointmentDate: { $gte: start, $lt: end },
      status: { $nin: ["CANCELLED", "NO_SHOW"] },
    }).select("scheduledTime");
    res.json({ success: true, bookedTimes: appointments.map((a) => a.scheduledTime) });
  } catch (error) {
    console.error("getDoctorAvailability:", error);
    res.status(500).json({ success: false, message: "Failed to load availability." });
  }
};

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

const populateDoctor = (query) => query
  .populate("user", "name email isActive")
  .populate("department", "name code description isActive")
  .populate("hospital", "name");

const listDoctors = async (req, res) => {
  try {
    const hospital = await getAdminHospital(req.user);
    if (!hospital) return res.status(403).json({ success: false, message: "Hospital access not found." });
    const doctors = await populateDoctor(Doctor.find({ hospital: hospital._id }).sort({ status: 1, createdAt: -1 }));
    res.json({ success: true, hospital: { _id: hospital._id, name: hospital.name }, doctors });
  } catch (error) {
    console.error("listDoctors:", error);
    res.status(500).json({ success: false, message: "Failed to load doctors." });
  }
};

const createDoctor = async (req, res) => {
  try {
    const hospital = await getAdminHospital(req.user);
    if (!hospital) return res.status(403).json({ success: false, message: "Hospital access not found." });

    const { name, email, password, departmentId, designation, specialization, licenseNumber, experienceYears, consultationFee } = req.body;
    if (!name?.trim() || !email?.trim() || !password || !departmentId) {
      return res.status(400).json({ success: false, message: "Name, email, password and department are required." });
    }
    if (!mongoose.isValidObjectId(departmentId)) return res.status(400).json({ success: false, message: "Invalid department." });
    if (password.length < 6) return res.status(400).json({ success: false, message: "Doctor password must be at least 6 characters." });

    const department = await Department.findOne({ _id: departmentId, hospital: hospital._id, isActive: true });
    if (!department) return res.status(404).json({ success: false, message: "Department not found for this hospital." });
    const normalizedEmail = email.trim().toLowerCase();
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) return res.status(409).json({ success: false, message: "An account with this email already exists." });

    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password: await bcrypt.hash(password, 12),
      role: "DOCTOR",
      businessId: hospital._id,
      isActive: true,
    });

    try {
      const doctor = await Doctor.create({
        user: user._id,
        hospital: hospital._id,
        department: department._id,
        designation: designation?.trim() || "Consultant",
        specialization: specialization?.trim() || "General Medicine",
        licenseNumber: licenseNumber?.trim() || "",
        experienceYears: Number(experienceYears) || 0,
        consultationFee: Number(consultationFee) || 0,
      });
      if (!department.ownerDoctor) {
        department.ownerDoctor = doctor._id;
        await department.save();
      }
      const result = await populateDoctor(Doctor.findById(doctor._id));
      return res.status(201).json({ success: true, message: "Doctor created successfully.", doctor: result });
    } catch (doctorError) {
      await User.findByIdAndDelete(user._id);
      throw doctorError;
    }
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ success: false, message: "This doctor or department assignment already exists." });
    console.error("createDoctor:", error);
    res.status(500).json({ success: false, message: "Failed to create doctor." });
  }
};

const updateDoctor = async (req, res) => {
  try {
    const hospital = await getAdminHospital(req.user);
    if (!hospital) return res.status(403).json({ success: false, message: "Hospital access not found." });
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ success: false, message: "Invalid doctor id." });

    const doctor = await Doctor.findOne({ _id: req.params.id, hospital: hospital._id });
    if (!doctor) return res.status(404).json({ success: false, message: "Doctor not found." });

    const { name, designation, specialization, licenseNumber, experienceYears, consultationFee, status, departmentId } = req.body;
    if (departmentId && String(departmentId) !== String(doctor.department)) {
      if (!mongoose.isValidObjectId(departmentId)) return res.status(400).json({ success: false, message: "Invalid department." });
      const nextDepartment = await Department.findOne({ _id: departmentId, hospital: hospital._id, isActive: true });
      if (!nextDepartment) return res.status(404).json({ success: false, message: "Department not found." });
      const previousDepartmentId = doctor.department;
      doctor.department = nextDepartment._id;
      if (String(await Department.findById(previousDepartmentId).then((d) => d?.ownerDoctor || "")) === String(doctor._id)) {
        await Department.findByIdAndUpdate(previousDepartmentId, { ownerDoctor: null });
      }
      if (!nextDepartment.ownerDoctor) {
        nextDepartment.ownerDoctor = doctor._id;
        await nextDepartment.save();
      }
    }

    if (name !== undefined) await User.findByIdAndUpdate(doctor.user, { name: String(name).trim() });
    if (designation !== undefined) doctor.designation = String(designation).trim();
    if (specialization !== undefined) doctor.specialization = String(specialization).trim();
    if (licenseNumber !== undefined) doctor.licenseNumber = String(licenseNumber).trim();
    if (experienceYears !== undefined) doctor.experienceYears = Number(experienceYears);
    if (consultationFee !== undefined) doctor.consultationFee = Number(consultationFee);
    if (status !== undefined) {
      if (!["ACTIVE", "ON_LEAVE", "INACTIVE"].includes(status)) {
        return res.status(400).json({ success: false, message: "Invalid doctor status." });
      }
      doctor.status = status;
      await User.findByIdAndUpdate(doctor.user, { isActive: status !== "INACTIVE" });
    }
    await doctor.save();

    const result = await populateDoctor(Doctor.findById(doctor._id));
    res.json({ success: true, message: "Doctor updated successfully.", doctor: result });
  } catch (error) {
    console.error("updateDoctor:", error);
    res.status(500).json({ success: false, message: "Failed to update doctor." });
  }
};

const getMyDoctor = async (req, res) => {
  try {
    const doctor = await populateDoctor(Doctor.findOne({ user: req.user._id, status: { $ne: "INACTIVE" } }));
    if (!doctor) return res.status(404).json({ success: false, message: "Doctor profile not found." });
    res.json({ success: true, doctor });
  } catch (error) {
    console.error("getMyDoctor:", error);
    res.status(500).json({ success: false, message: "Failed to load doctor profile." });
  }
};

const updateMyDoctorProfile = async (req, res) => {
  try {
    const doctor = await Doctor.findOne({ user: req.user._id, status: { $ne: "INACTIVE" } });
    if (!doctor) return res.status(404).json({ success: false, message: "Doctor profile not found." });

    const { name, designation, specialization, licenseNumber, experienceYears, consultationFee } = req.body;
    if (name !== undefined) {
      const cleanName = String(name).trim();
      if (cleanName.length < 2) return res.status(400).json({ success: false, message: "Name must be at least 2 characters." });
      await User.findByIdAndUpdate(doctor.user, { name: cleanName });
    }
    if (designation !== undefined) doctor.designation = String(designation).trim() || "Consultant";
    if (specialization !== undefined) doctor.specialization = String(specialization).trim() || "General Medicine";
    if (licenseNumber !== undefined) doctor.licenseNumber = String(licenseNumber).trim();
    if (experienceYears !== undefined) doctor.experienceYears = Math.max(0, Number(experienceYears) || 0);
    if (consultationFee !== undefined) doctor.consultationFee = Math.max(0, Number(consultationFee) || 0);
    await doctor.save();

    const result = await populateDoctor(Doctor.findById(doctor._id));
    res.json({ success: true, message: "Doctor profile updated successfully.", doctor: result });
  } catch (error) {
    console.error("updateMyDoctorProfile:", error);
    res.status(500).json({ success: false, message: "Failed to update doctor profile." });
  }
};

module.exports = { listDoctors, createDoctor, updateDoctor, getMyDoctor, updateMyDoctorProfile, listPublicDoctors, getDoctorAvailability };
