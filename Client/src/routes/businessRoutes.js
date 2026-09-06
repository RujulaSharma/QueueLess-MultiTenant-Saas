const express = require("express");
const { listBusinesses, getBusiness, listServices } = require("../controllers/businessController");
const { listPublicDepartments } = require("../controllers/departmentController");

const router = express.Router();

router.get("/", listBusinesses);
router.get("/:id/departments", listPublicDepartments);
router.get("/:id/services", listServices);
router.get("/:id", getBusiness);

module.exports = router;
