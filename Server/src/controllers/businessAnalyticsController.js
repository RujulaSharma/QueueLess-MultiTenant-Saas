const {
  getBusinessAnalytics,
} = require("../services/businessAnalyticsService");

const getAnalyticsDashboard = async (req, res) => {
  try {
    const requestedBusinessId = req.query.businessId;
    const businessId = req.user?.businessId;
    const days = req.query.days;

    if (!businessId) {
      return res.status(400).json({
        success: false,
        message: "Your account is not connected to a business",
      });
    }

    if (requestedBusinessId && String(requestedBusinessId) !== String(businessId)) {
      return res.status(403).json({
        success: false,
        message: "You can only view analytics for your business",
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
