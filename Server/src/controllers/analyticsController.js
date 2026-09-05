const {
  buildServiceAnalytics,
} = require("../services/analyticsService");

const getServiceAnalytics = async (req, res) => {
  try {
    const { businessId, serviceId, days = 30 } = req.query;

    if (!businessId || !serviceId) {
      return res.status(400).json({
        success: false,
        message: "businessId and serviceId are required",
      });
    }

    const parsedDays = Math.min(Math.max(Number(days) || 30, 1), 365);

    const analytics = await buildServiceAnalytics({
      businessId,
      serviceId,
      days: parsedDays,
    });

    return res.status(200).json({
      success: true,
      analytics,
    });
  } catch (error) {
    console.error("Service analytics error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to calculate service analytics",
    });
  }
};

module.exports = {
  getServiceAnalytics,
};
