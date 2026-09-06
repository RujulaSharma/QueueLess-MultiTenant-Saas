const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const requireRole = require("../middleware/roleMiddleware");
const { listDoctors, createDoctor, updateDoctor, getMyDoctor, updateMyDoctorProfile, listPublicDoctors, getDoctorAvailability } = require("../controllers/doctorController");

const router = express.Router();
router.use(authMiddleware);

// Doctor's own profile
router.get("/public", requireRole("CUSTOMER", "ADMIN", "STAFF", "DOCTOR"), listPublicDoctors);
router.get("/availability", requireRole("CUSTOMER", "ADMIN", "STAFF", "DOCTOR"), getDoctorAvailability);
router.get("/me", requireRole("DOCTOR"), getMyDoctor);
router.patch("/me/profile", requireRole("DOCTOR"), updateMyDoctorProfile);

// Hospital management endpoints
router.get("/", requireRole("ADMIN"), listDoctors);
router.post("/", requireRole("ADMIN"), createDoctor);
router.patch("/:id", requireRole("ADMIN"), updateDoctor);

module.exports = router;
