const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const { getQueuePrediction } = require("../controllers/predictionController");

const router = express.Router();

router.get("/wait-time", authMiddleware, getQueuePrediction);

module.exports = router;
