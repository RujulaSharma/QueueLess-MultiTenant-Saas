const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const requireRole = require("../middleware/roleMiddleware");
const {
  getBusinessDashboard,
} = require("../controllers/businessDashboardController");

const router = express.Router();

router.get(
  "/",
  authMiddleware,
  requireRole("ADMIN", "STAFF"),
  getBusinessDashboard
);

module.exports = router;
