const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const {
  getProjects,
  getProjectDashboard,
  getProjectById,
  createProject,
  updateProject,
  deleteProject,
  addMember,
  removeMember,
  getCollaborators,
} = require("../controllers/projectController");

// All routes require authentication
router.use(authMiddleware);

router.get("/dashboard", getProjectDashboard);
router.get("/collaborators", getCollaborators);

router.route("/")
  .get(getProjects)
  .post(createProject);

router.route("/:id")
  .get(getProjectById)
  .put(updateProject)
  .delete(deleteProject);

router.post("/:id/members", addMember);
router.delete("/:id/members/:userId", removeMember);

module.exports = router;
