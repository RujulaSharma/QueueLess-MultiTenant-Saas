const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const requireRole = require("../middleware/roleMiddleware");
const {
  listAdminServices,
  createService,
  updateService,
  toggleService,
} = require("../controllers/serviceController");

const router = express.Router();

router.use(authMiddleware, requireRole("ADMIN"));

router.get("/", listAdminServices);
router.post("/", createService);
router.patch("/:id", updateService);
router.patch("/:id/toggle", toggleService);

module.exports = router;
