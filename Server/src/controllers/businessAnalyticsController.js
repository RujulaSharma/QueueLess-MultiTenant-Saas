const {
  getBusinessAnalytics,
} = require("../services/businessAnalyticsService");

const getAnalyticsDashboard = async (req, res) => {
  try {
    const { businessId, days = 30 } = req.query;

    if (!businessId) {
      return res.status(400).json({
        success: false,
        message: "businessId is required",
      });
    }

    const parsedDays = Math.min(Math.max(Number(days) || 30, 1), 365);

    const analytics = await getBusinessAnalytics({
      businessId,
      days: parsedDays,
    });

    return res.status(200).json({
      success: true,
      analytics,
    });
  } catch (error) {
    console.error("Business analytics dashboard error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to load analytics dashboard",
    });
  }
};

module.exports = { getAnalyticsDashboard };
