const Business = require("../models/Business");
const Service = require("../models/Service");

const listBusinesses = async (req, res) => {
  try {
    const businesses = await Business.find({ isActive: true })
      .select("name description category address phone email openingHours")
      .sort({ name: 1 });

    res.json({ success: true, count: businesses.length, businesses });
  } catch (error) {
    console.error("List businesses error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch businesses" });
  }
};

const getBusiness = async (req, res) => {
  try {
    const business = await Business.findOne({ _id: req.params.id, isActive: true })
      .select("name description category address phone email openingHours");

    if (!business) {
      return res.status(404).json({ success: false, message: "Business not found" });
    }

    res.json({ success: true, business });
  } catch (error) {
    console.error("Get business error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch business" });
  }
};

const listServices = async (req, res) => {
  try {
    const services = await Service.find({
      business: req.params.id,
      isActive: true,
    })
      .select("name description averageDuration bufferTime price maxDailyCapacity")
      .sort({ name: 1 });

    res.json({ success: true, count: services.length, services });
  } catch (error) {
    console.error("List services error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch services" });
  }
};

module.exports = { listBusinesses, getBusiness, listServices };
