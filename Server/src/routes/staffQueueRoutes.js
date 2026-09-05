const express = require("express");
const { callNext, startServing, completeService, skipQueue, markNoShow } = require("../controllers/staffQueueController");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/next", authMiddleware, callNext);
router.patch("/:id/start", authMiddleware, startServing);
router.patch("/:id/complete", authMiddleware, completeService);
router.patch("/:id/skip", authMiddleware, skipQueue);
router.patch("/:id/no-show", authMiddleware, markNoShow);

module.exports = router;
