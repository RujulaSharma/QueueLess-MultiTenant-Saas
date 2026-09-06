const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const requireRole = require("../middleware/roleMiddleware");
const {
  listDepartments,
  createDepartment,
  updateDepartment,
  toggleDepartment,
} = require("../controllers/departmentController");

const router = express.Router();
router.use(authMiddleware, requireRole("ADMIN"));
router.get("/", listDepartments);
router.post("/", createDepartment);
router.patch("/:id", updateDepartment);
router.patch("/:id/toggle", toggleDepartment);
module.exports = router;
