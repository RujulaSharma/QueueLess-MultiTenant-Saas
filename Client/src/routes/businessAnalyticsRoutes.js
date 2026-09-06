const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const requireRole = require("../middleware/roleMiddleware");
const {
  getAnalyticsDashboard,
} = require("../controllers/businessAnalyticsController");

const router = express.Router();

router.get(
  "/dashboard",
  authMiddleware,
  requireRole("ADMIN", "STAFF"),
  getAnalyticsDashboard
);

module.exports = router;
