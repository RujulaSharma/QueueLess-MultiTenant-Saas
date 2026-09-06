const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const requireRole = require("../middleware/roleMiddleware");
const {
  getMyBusiness,
  createBusiness,
  updateBusiness,
  toggleBusiness,
} = require("../controllers/adminBusinessController");

const router = express.Router();

router.use(authMiddleware, requireRole("ADMIN"));

router.get("/", getMyBusiness);
router.post("/", createBusiness);
router.patch("/:id", updateBusiness);
router.patch("/:id/toggle", toggleBusiness);

module.exports = router;
