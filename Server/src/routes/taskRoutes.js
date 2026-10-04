const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const {
  getTasks,
  getTaskById,
  createTask,
  updateTask,
  updateTaskStatus,
  assignTask,
  addComment,
  addAttachment,
  deleteAttachment,
  deleteTask,
} = require("../controllers/taskController");

// All routes require authentication
router.use(authMiddleware);

router.route("/")
  .get(getTasks)
  .post(createTask);

router.route("/:id")
  .get(getTaskById)
  .put(updateTask)
  .delete(deleteTask);

router.patch("/:id/status", updateTaskStatus);
router.patch("/:id/assign", assignTask);
router.post("/:id/comments", addComment);
router.post("/:id/attachments", addAttachment);
router.delete("/:id/attachments/:attachmentId", deleteAttachment);

module.exports = router;
