const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const { getMe, updateMe } = require("../controllers/profileController");

const router = express.Router();

router.get("/me", authMiddleware, getMe);
router.patch("/me", authMiddleware, updateMe);

module.exports = router;
