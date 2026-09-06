const mongoose = require("mongoose");
const Service = require("../models/Service");
const Business = require("../models/Business");

const getOwnedBusiness = async (user) => {
  if (!user?.businessId) return null;
  return Business.findOne({
    _id: user.businessId,
    owner: user._id,
    isActive: true,
  });
};

const validateServicePayload = (body) => {
  const name = String(body.name || "").trim();
  const averageDuration = Number(body.averageDuration);
  const bufferTime = Number(body.bufferTime ?? 5);
  const price = Number(body.price ?? 0);
  const maxDailyCapacity = Number(body.maxDailyCapacity ?? 100);

  if (!name) return { error: "Service name is required" };
  if (!Number.isFinite(averageDuration) || averageDuration < 1)
    return { error: "Average duration must be at least 1 minute" };
  if (!Number.isFinite(bufferTime) || bufferTime < 0)
    return { error: "Buffer time cannot be negative" };
  if (!Number.isFinite(price) || price < 0)
    return { error: "Price cannot be negative" };
  if (!Number.isFinite(maxDailyCapacity) || maxDailyCapacity < 1)
    return { error: "Daily capacity must be at least 1" };

  return {
    value: {
      name,
      description: String(body.description || "").trim(),
      averageDuration,
      bufferTime,
      price,
      maxDailyCapacity,
      ...(typeof body.isActive === "boolean" ? { isActive: body.isActive } : {}),
    },
  };
};

const listAdminServices = async (req, res) => {
  try {
    const business = await getOwnedBusiness(req.user);
    if (!business) {
      return res.status(403).json({ success: false, message: "No business is assigned to this admin" });
    }

    const services = await Service.find({ business: business._id }).sort({ isActive: -1, name: 1 });
    res.json({ success: true, business, count: services.length, services });
  } catch (error) {
    console.error("List admin services error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch services" });
  }
};

const createService = async (req, res) => {
  try {
    const business = await getOwnedBusiness(req.user);
    if (!business) {
      return res.status(403).json({ success: false, message: "No business is assigned to this admin" });
    }

    const parsed = validateServicePayload(req.body);
    if (parsed.error) return res.status(400).json({ success: false, message: parsed.error });

    const duplicate = await Service.findOne({ business: business._id, name: parsed.value.name });
    if (duplicate) {
      return res.status(409).json({ success: false, message: "A service with this name already exists" });
    }

    const service = await Service.create({ ...parsed.value, business: business._id });
    res.status(201).json({ success: true, message: "Service created successfully", service });
  } catch (error) {
    console.error("Create service error:", error);
    res.status(500).json({ success: false, message: "Failed to create service" });
  }
};

const updateService = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: "Invalid service id" });
    }

    const business = await getOwnedBusiness(req.user);
    if (!business) {
      return res.status(403).json({ success: false, message: "No business is assigned to this admin" });
    }

    const service = await Service.findOne({ _id: req.params.id, business: business._id });
    if (!service) {
      return res.status(404).json({ success: false, message: "Service not found" });
    }

    const parsed = validateServicePayload({ ...service.toObject(), ...req.body });
    if (parsed.error) return res.status(400).json({ success: false, message: parsed.error });

    const duplicate = await Service.findOne({
      _id: { $ne: service._id },
      business: business._id,
      name: parsed.value.name,
    });
    if (duplicate) {
      return res.status(409).json({ success: false, message: "A service with this name already exists" });
    }

    Object.assign(service, parsed.value);
    await service.save();

    res.json({ success: true, message: "Service updated successfully", service });
  } catch (error) {
    console.error("Update service error:", error);
    res.status(500).json({ success: false, message: "Failed to update service" });
  }
};

const toggleService = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: "Invalid service id" });
    }

    const business = await getOwnedBusiness(req.user);
    if (!business) {
      return res.status(403).json({ success: false, message: "No business is assigned to this admin" });
    }

    const service = await Service.findOne({ _id: req.params.id, business: business._id });
    if (!service) {
      return res.status(404).json({ success: false, message: "Service not found" });
    }

    service.isActive = !service.isActive;
    await service.save();

    res.json({
      success: true,
      message: service.isActive ? "Service activated" : "Service deactivated",
      service,
    });
  } catch (error) {
    console.error("Toggle service error:", error);
    res.status(500).json({ success: false, message: "Failed to update service status" });
  }
};

module.exports = { listAdminServices, createService, updateService, toggleService };
