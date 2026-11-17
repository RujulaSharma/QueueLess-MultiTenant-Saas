const express = require("express");
const { isObjectIdOrHexString } = require("mongoose");
const Project = require("../models/Project");
const Task = require("../models/Task");
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
router.use(async (req, res, next) => {
  const taskId = req.path.split("/")[1];
  const requestedId = taskId || (req.method === "GET" ? req.query.projectId : req.body?.projectId);
  if (typeof requestedId !== "string" || !isObjectIdOrHexString(requestedId)) {
    return res.status(400).json({ success: false, message: "A valid task or project ID is required." });
  }
  const projectId = taskId ? (await Task.findById(taskId).select("projectId").lean())?.projectId : requestedId;
  const project = projectId && await Project.findOne({
    _id: projectId,
    businessId: req.user.businessId || null,
    $or: [{ owner: req.user._id }, { "members.user": req.user._id }],
  }).select("owner members").lean();
  if (!project) return res.status(404).json({ success: false, message: "Task or project not found." });
  const ownProject = String(project.owner) === String(req.user._id);
  const membership = project.members.find((member) => String(member.user) === String(req.user._id));
  if (req.method !== "GET" && !ownProject && membership?.role === "VIEWER") {
    return res.status(403).json({ success: false, message: "Project viewers cannot change tasks." });
  }
  const assignee = req.body?.assignedTo;
  if (assignee && ![project.owner, ...project.members.map((member) => member.user)].some((id) => String(id) === assignee)) {
    return res.status(400).json({ success: false, message: "Assign the task to a project member." });
  }
  next();
});

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
