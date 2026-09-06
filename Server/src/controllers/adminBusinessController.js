const mongoose = require("mongoose");
const Business = require("../models/Business");
const User = require("../models/User");

const safeUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  businessId: user.businessId || null,
  isActive: user.isActive,
  createdAt: user.createdAt,
});

const getOwnedBusiness = async (userId) => {
  return Business.findOne({ owner: userId }).sort({ isActive: -1, createdAt: 1 });
};

const getMyBusiness = async (req, res) => {
  try {
    let business = null;

    if (req.user.businessId && mongoose.isValidObjectId(req.user.businessId)) {
      business = await Business.findOne({
        _id: req.user.businessId,
        owner: req.user._id,
      });
    }

    if (!business) {
      business = await getOwnedBusiness(req.user._id);
    }

    if (!business) {
      return res.json({ success: true, business: null });
    }

    if (!req.user.businessId || String(req.user.businessId) !== String(business._id)) {
      await User.findByIdAndUpdate(req.user._id, { businessId: business._id });
      req.user.businessId = business._id;
    }

    res.json({ success: true, business });
  } catch (error) {
    console.error("getMyBusiness:", error);
    res.status(500).json({ success: false, message: "Failed to load business profile." });
  }
};

const createBusiness = async (req, res) => {
  try {
    const existing = await getOwnedBusiness(req.user._id);
    if (existing) {
      return res.status(409).json({
        success: false,
        message: "You already have a hospital/business. Edit the existing profile instead.",
        business: existing,
      });
    }

    const {
      name, description, category, address, phone, email, openingHours,
    } = req.body;

    if (!name?.trim()) {
      return res.status(400).json({ success: false, message: "Hospital/business name is required." });
    }

    const business = await Business.create({
      name: name.trim(),
      description: description?.trim() || "",
      category: category?.trim() || "Hospital",
      address: address?.trim() || "",
      phone: phone?.trim() || "",
      email: email?.trim()?.toLowerCase() || "",
      owner: req.user._id,
      openingHours: openingHours || undefined,
      isActive: true,
    });

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { businessId: business._id, role: "ADMIN" },
      { new: true }
    ).select("-password");

    res.status(201).json({
      success: true,
      message: "Hospital/business created and connected to your admin account.",
      business,
      user: safeUser(user),
    });
  } catch (error) {
    console.error("createBusiness:", error);
    res.status(500).json({ success: false, message: "Failed to create hospital/business." });
  }
};

const updateBusiness = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: "Invalid business id." });
    }

    const business = await Business.findOne({
      _id: req.params.id,
      owner: req.user._id,
    });

    if (!business) {
      return res.status(404).json({ success: false, message: "Business not found." });
    }

    const fields = ["name", "description", "category", "address", "phone", "email", "openingHours"];

    for (const field of fields) {
      if (req.body[field] !== undefined) {
        if (field === "email") {
          business[field] = String(req.body[field] || "").trim().toLowerCase();
        } else if (field === "openingHours") {
          business[field] = req.body[field] || business[field];
        } else {
          business[field] = String(req.body[field] || "").trim();
        }
      }
    }

    if (!business.name) {
      return res.status(400).json({ success: false, message: "Hospital/business name is required." });
    }

    await business.save();

    await User.findByIdAndUpdate(req.user._id, {
      businessId: business._id,
      role: "ADMIN",
    });

    res.json({
      success: true,
      message: "Hospital/business profile updated successfully.",
      business,
    });
  } catch (error) {
    console.error("updateBusiness:", error);
    res.status(500).json({ success: false, message: "Failed to update hospital/business." });
  }
};

const toggleBusiness = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: "Invalid business id." });
    }

    const business = await Business.findOne({
      _id: req.params.id,
      owner: req.user._id,
    });

    if (!business) {
      return res.status(404).json({ success: false, message: "Business not found." });
    }

    business.isActive = !business.isActive;
    await business.save();

    res.json({
      success: true,
      message: business.isActive ? "Business activated." : "Business deactivated.",
      business,
    });
  } catch (error) {
    console.error("toggleBusiness:", error);
    res.status(500).json({ success: false, message: "Failed to update business status." });
  }
};

module.exports = { getMyBusiness, createBusiness, updateBusiness, toggleBusiness };
