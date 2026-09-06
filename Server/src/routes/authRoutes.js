const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const { register, login, getCurrentUser } = require("../controllers/authController");

const router = express.Router();

router.post("/register", register);
router.post("/login", login);

router.get("/me", authMiddleware, getCurrentUser);

module.exports = router;
