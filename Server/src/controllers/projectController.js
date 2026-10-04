const Project = require("../models/Project");
const Task = require("../models/Task");
const User = require("../models/User");

// Helper to calculate project metrics
const calculateProjectProgress = async (projectId) => {
  const tasks = await Task.find({ projectId });
  if (tasks.length === 0) return 0;
  const doneCount = tasks.filter((t) => t.status === "DONE").length;
  return Math.round((doneCount / tasks.length) * 100);
};

// @desc Get all projects for current user
// @route GET /api/projects
exports.getProjects = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const businessId = req.user.businessId;

    const filter = {
      $or: [
        { owner: userId },
        { "members.user": userId },
        ...(businessId ? [{ businessId }] : []),
      ],
    };

    const projects = await Project.find(filter)
      .populate("owner", "name email role")
      .populate("members.user", "name email role")
      .sort({ updatedAt: -1 });

    // Attach task summary metrics to each project
    const enhancedProjects = await Promise.all(
      projects.map(async (p) => {
        const tasks = await Task.find({ projectId: p._id }).select("status deadline");
        const totalTasks = tasks.length;
        const doneTasks = tasks.filter((t) => t.status === "DONE").length;
        const computedProgress = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : p.progress;

        return {
          ...p.toObject(),
          totalTasks,
          doneTasks,
          progress: computedProgress,
        };
      })
    );

    res.status(200).json({
      success: true,
      count: enhancedProjects.length,
      data: enhancedProjects,
    });
  } catch (error) {
    next(error);
  }
};

// @desc Get workspace dashboard overview metrics
// @route GET /api/projects/dashboard
exports.getProjectDashboard = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const businessId = req.user.businessId;

    const projectFilter = {
      $or: [
        { owner: userId },
        { "members.user": userId },
        ...(businessId ? [{ businessId }] : []),
      ],
    };

    const projects = await Project.find(projectFilter);
    const projectIds = projects.map((p) => p._id);

    const tasks = await Task.find({ projectId: { $in: projectIds } })
      .populate("assignedTo", "name email role")
      .populate("projectId", "name")
      .populate("createdBy", "name email");

    const totalProjects = projects.length;
    const activeProjects = projects.filter((p) => p.status === "IN_PROGRESS").length;
    const completedProjects = projects.filter((p) => p.status === "COMPLETED").length;

    const totalTasks = tasks.length;
    const tasksByStatus = {
      TODO: tasks.filter((t) => t.status === "TODO").length,
      IN_PROGRESS: tasks.filter((t) => t.status === "IN_PROGRESS").length,
      IN_REVIEW: tasks.filter((t) => t.status === "IN_REVIEW").length,
      DONE: tasks.filter((t) => t.status === "DONE").length,
    };

    const myAssignedTasks = tasks.filter(
      (t) => t.assignedTo && String(t.assignedTo._id) === String(userId)
    );

    // Upcoming deadlines within next 30 days
    const now = new Date();
    const futureLimit = new Date();
    futureLimit.setDate(futureLimit.getDate() + 30);

    const upcomingTasks = tasks
      .filter((t) => t.deadline && new Date(t.deadline) >= now && new Date(t.deadline) <= futureLimit && t.status !== "DONE")
      .sort((a, b) => new Date(a.deadline) - new Date(b.deadline))
      .slice(0, 8);

    // Recent activity (latest updated tasks)
    const recentTasks = [...tasks]
      .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
      .slice(0, 6);

    res.status(200).json({
      success: true,
      data: {
        summary: {
          totalProjects,
          activeProjects,
          completedProjects,
          totalTasks,
          myAssignedCount: myAssignedTasks.length,
          completionRate: totalTasks > 0 ? Math.round((tasksByStatus.DONE / totalTasks) * 100) : 0,
        },
        tasksByStatus,
        upcomingTasks,
        recentTasks,
        myAssignedTasks: myAssignedTasks.slice(0, 10),
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc Get single project by ID with tasks
// @route GET /api/projects/:id
exports.getProjectById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const project = await Project.findById(id)
      .populate("owner", "name email role")
      .populate("members.user", "name email role");

    if (!project) {
      return res.status(404).json({ success: false, message: "Project not found" });
    }

    const tasks = await Task.find({ projectId: id })
      .populate("assignedTo", "name email role")
      .populate("createdBy", "name email")
      .populate("comments.user", "name email")
      .populate("attachments.uploadedBy", "name email")
      .sort({ createdAt: -1 });

    const totalTasks = tasks.length;
    const doneTasks = tasks.filter((t) => t.status === "DONE").length;
    const computedProgress = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : project.progress;

    res.status(200).json({
      success: true,
      data: {
        ...project.toObject(),
        progress: computedProgress,
        totalTasks,
        doneTasks,
        tasks,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc Create new project
// @route POST /api/projects
exports.createProject = async (req, res, next) => {
  try {
    const { name, description, priority, category, deadline } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: "Project name is required" });
    }

    const project = await Project.create({
      name: name.trim(),
      description: description ? description.trim() : "",
      priority: priority || "MEDIUM",
      category: category ? category.trim() : "General",
      deadline: deadline || null,
      owner: req.user._id,
      businessId: req.user.businessId || null,
      members: [
        {
          user: req.user._id,
          role: "OWNER",
        },
      ],
    });

    const populatedProject = await Project.findById(project._id)
      .populate("owner", "name email role")
      .populate("members.user", "name email role");

    res.status(201).json({
      success: true,
      message: "Project created successfully",
      data: populatedProject,
    });
  } catch (error) {
    next(error);
  }
};

// @desc Update project details
// @route PUT /api/projects/:id
exports.updateProject = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, description, status, priority, category, deadline, progress } = req.body;

    const project = await Project.findById(id);
    if (!project) {
      return res.status(404).json({ success: false, message: "Project not found" });
    }

    if (name) project.name = name.trim();
    if (description !== undefined) project.description = description.trim();
    if (status) project.status = status;
    if (priority) project.priority = priority;
    if (category) project.category = category.trim();
    if (deadline !== undefined) project.deadline = deadline || null;
    if (progress !== undefined) project.progress = Number(progress);

    await project.save();

    const populatedProject = await Project.findById(project._id)
      .populate("owner", "name email role")
      .populate("members.user", "name email role");

    // Realtime notification
    const io = req.app.get("io");
    if (io) {
      io.to(`project:${id}`).emit("project:updated", populatedProject);
    }

    res.status(200).json({
      success: true,
      message: "Project updated successfully",
      data: populatedProject,
    });
  } catch (error) {
    next(error);
  }
};

// @desc Delete project and associated tasks
// @route DELETE /api/projects/:id
exports.deleteProject = async (req, res, next) => {
  try {
    const { id } = req.params;
    const project = await Project.findById(id);
    if (!project) {
      return res.status(404).json({ success: false, message: "Project not found" });
    }

    await Task.deleteMany({ projectId: id });
    await Project.findByIdAndDelete(id);

    const io = req.app.get("io");
    if (io) {
      io.to(`project:${id}`).emit("project:deleted", { projectId: id });
    }

    res.status(200).json({
      success: true,
      message: "Project and all associated tasks deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

// @desc Add member to project
// @route POST /api/projects/:id/members
exports.addMember = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { email, userId, role } = req.body;

    const project = await Project.findById(id);
    if (!project) {
      return res.status(404).json({ success: false, message: "Project not found" });
    }

    let targetUser;
    if (userId) {
      targetUser = await User.findById(userId);
    } else if (email) {
      targetUser = await User.findOne({ email: email.toLowerCase().trim() });
    }

    if (!targetUser) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const alreadyMember = project.members.some(
      (m) => String(m.user) === String(targetUser._id)
    );

    if (alreadyMember) {
      return res.status(400).json({ success: false, message: "User is already a project member" });
    }

    project.members.push({
      user: targetUser._id,
      role: role || "MEMBER",
    });

    await project.save();

    const populatedProject = await Project.findById(project._id)
      .populate("owner", "name email role")
      .populate("members.user", "name email role");

    const io = req.app.get("io");
    if (io) {
      io.to(`project:${id}`).emit("project:updated", populatedProject);
    }

    res.status(200).json({
      success: true,
      message: `${targetUser.name} added to project`,
      data: populatedProject,
    });
  } catch (error) {
    next(error);
  }
};

// @desc Remove member from project
// @route DELETE /api/projects/:id/members/:userId
exports.removeMember = async (req, res, next) => {
  try {
    const { id, userId } = req.params;

    const project = await Project.findById(id);
    if (!project) {
      return res.status(404).json({ success: false, message: "Project not found" });
    }

    if (String(project.owner) === String(userId)) {
      return res.status(400).json({ success: false, message: "Cannot remove the project owner" });
    }

    project.members = project.members.filter(
      (m) => String(m.user) !== String(userId)
    );

    await project.save();

    const populatedProject = await Project.findById(project._id)
      .populate("owner", "name email role")
      .populate("members.user", "name email role");

    const io = req.app.get("io");
    if (io) {
      io.to(`project:${id}`).emit("project:updated", populatedProject);
    }

    res.status(200).json({
      success: true,
      message: "Member removed from project",
      data: populatedProject,
    });
  } catch (error) {
    next(error);
  }
};

// @desc Get available collaborators/users for assignment
// @route GET /api/projects/collaborators
exports.getCollaborators = async (req, res, next) => {
  try {
    const businessId = req.user.businessId;
    const filter = { isActive: true };
    if (businessId) {
      filter.businessId = businessId;
    }

    const users = await User.find(filter).select("name email role").limit(50);

    res.status(200).json({
      success: true,
      data: users,
    });
  } catch (error) {
    next(error);
  }
};
