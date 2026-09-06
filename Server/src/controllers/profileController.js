const bcrypt = require("bcryptjs");
const User = require("../models/User");
const Doctor = require("../models/Doctor");
const Business = require("../models/Business");

const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).lean();
    if (!user) return res.status(404).json({ success: false, message: "Account not found" });

    const responseUser = {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      businessId: user.businessId || null,
      isActive: user.isActive,
      createdAt: user.createdAt,
    };

    const profile = {};

    if (user.role === "ADMIN" || user.role === "STAFF") {
      const hospital = await Business.findOne({ owner: user._id }).lean();
      const connectedHospital = hospital || (user.businessId ? await Business.findById(user.businessId).lean() : null);
      if (connectedHospital) {
        profile.hospital = {
          id: connectedHospital._id,
          name: connectedHospital.name,
          category: connectedHospital.category,
          address: connectedHospital.address,
          phone: connectedHospital.phone,
          email: connectedHospital.email,
          isActive: connectedHospital.isActive,
        };
      }
    }

    if (user.role === "DOCTOR") {
      const doctor = await Doctor.findOne({ user: user._id })
        .populate("department", "name code")
        .populate("hospital", "name category")
        .lean();

      if (doctor) {
        profile.doctor = {
          designation: doctor.designation,
          specialization: doctor.specialization,
          licenseNumber: doctor.licenseNumber,
          experienceYears: doctor.experienceYears,
          consultationFee: doctor.consultationFee,
          status: doctor.status,
          department: doctor.department || null,
          hospital: doctor.hospital || null,
        };
      }
    }

    res.json({ success: true, user: responseUser, profile });
  } catch (error) {
    console.error("Get profile error:", error);
    res.status(500).json({ success: false, message: "Failed to load profile" });
  }
};

const updateMe = async (req, res) => {
  try {
    const { name, email } = req.body;

    if (name !== undefined && (!name.trim() || name.trim().length < 2)) {
      return res.status(400).json({ success: false, message: "Name must be at least 2 characters" });
    }

    if (email !== undefined && !/^\S+@\S+\.\S+$/.test(email.trim())) {
      return res.status(400).json({ success: false, message: "Please provide a valid email" });
    }

    const user = await User.findById(req.user._id);

    if (name !== undefined) user.name = name.trim();

    if (email !== undefined) {
      const normalizedEmail = email.trim().toLowerCase();
      const duplicate = await User.findOne({
        email: normalizedEmail,
        _id: { $ne: req.user._id },
      });

      if (duplicate) {
        return res.status(409).json({ success: false, message: "That email is already in use" });
      }

      user.email = normalizedEmail;
    }

    await user.save();

    res.json({
      success: true,
      message: "Profile updated successfully",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        businessId: user.businessId || null,
        isActive: user.isActive,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error("Update profile error:", error);
    res.status(500).json({ success: false, message: "Failed to update profile" });
  }
};

module.exports = { getMe, updateMe };
