const express = require("express");
const { callNext, startServing, completeService, skipQueue, markNoShow } = require("../controllers/staffQueueController");
const authMiddleware = require("../middleware/authMiddleware");
const requireRole = require("../middleware/roleMiddleware");

const router = express.Router();
router.use(authMiddleware, requireRole("ADMIN", "STAFF"));

router.post("/next", callNext);
router.patch("/:id/start", startServing);
router.patch("/:id/complete", completeService);
router.patch("/:id/skip", skipQueue);
router.patch("/:id/no-show", markNoShow);

module.exports = router;
