const express = require("express");

const {
  createAppointment,
  getMyAppointments,
  getBusinessAppointments,
  updateAppointmentStatus,
  cancelMyAppointment,
} = require("../controllers/appointmentController");

const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/", authMiddleware, createAppointment);
router.get("/my", authMiddleware, getMyAppointments);
router.get("/business/:businessId", authMiddleware, getBusinessAppointments);
router.patch("/:id/status", authMiddleware, updateAppointmentStatus);
router.patch("/:id/cancel", authMiddleware, cancelMyAppointment);

module.exports = router;
