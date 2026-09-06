const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const requireRole = require("../middleware/roleMiddleware");
const controller = require("../controllers/doctorDashboardController");

const router = express.Router();
router.use(authMiddleware, requireRole("DOCTOR"));

router.get("/", controller.getDoctorDashboard);
router.post("/queue/next", controller.callNext);
router.patch("/queue/:id/start", controller.startServing);
router.patch("/queue/:id/complete", controller.completeService);
router.patch("/queue/:id/skip", controller.skipQueue);
router.patch("/queue/:id/no-show", controller.markNoShow);
router.patch("/appointments/:id/status", controller.updateAppointmentStatus);

module.exports = router;
