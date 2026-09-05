const express = require("express");
const { joinQueue, getMyQueue, getBusinessQueue, cancelQueue } = require("../controllers/queueController");
const authMiddleware = require("../middleware/authMiddleware");
const router = express.Router();
router.post("/join", authMiddleware, joinQueue);
router.get("/my", authMiddleware, getMyQueue);
router.get("/business/:businessId", authMiddleware, getBusinessQueue);
router.patch("/:id/cancel", authMiddleware, cancelQueue);
module.exports = router;
