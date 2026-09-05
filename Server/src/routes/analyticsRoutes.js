const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const { getServiceAnalytics } = require("../controllers/analyticsController");

const router = express.Router();

router.get("/service", authMiddleware, getServiceAnalytics);

module.exports = router;
