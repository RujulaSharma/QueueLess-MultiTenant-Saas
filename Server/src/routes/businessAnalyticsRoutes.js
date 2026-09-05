const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const {
  getAnalyticsDashboard,
} = require("../controllers/businessAnalyticsController");

const router = express.Router();

router.get("/dashboard", authMiddleware, getAnalyticsDashboard);

module.exports = router;
