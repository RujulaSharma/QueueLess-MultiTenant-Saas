const express = require("express");
const {
  checkInAppointment,
  createAppointment,
  getMyAppointments,
  getBusinessAppointments,
  updateAppointmentStatus,
  cancelMyAppointment,
} = require("../controllers/appointmentController");
const authMiddleware = require("../middleware/authMiddleware");
const requireRole = require("../middleware/roleMiddleware");

const router = express.Router();

router.post("/", authMiddleware, createAppointment);
router.post("/admin", authMiddleware, requireRole("ADMIN", "STAFF"), createAppointment);
router.get("/my", authMiddleware, getMyAppointments);
router.get("/business/:businessId", authMiddleware, requireRole("ADMIN", "STAFF"), getBusinessAppointments);
router.patch("/:id/status", authMiddleware, requireRole("ADMIN", "STAFF"), updateAppointmentStatus);
router.patch("/:id/check-in", authMiddleware, checkInAppointment);
router.patch("/:id/cancel", authMiddleware, cancelMyAppointment);

module.exports = router;
