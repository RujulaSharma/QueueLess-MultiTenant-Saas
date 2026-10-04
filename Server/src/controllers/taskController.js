const Task = require("../models/Task");
const Project = require("../models/Project");

// Helper to recalculate and sync project progress
const syncProjectProgress = async (projectId, io) => {
  try {
    const tasks = await Task.find({ projectId });
    if (tasks.length === 0) return;
    const doneTasks = tasks.filter((t) => t.status === "DONE").length;
    const progress = Math.round((doneTasks / tasks.length) * 100);

    const project = await Project.findByIdAndUpdate(
      projectId,
      { progress },
      { new: true }
    )
      .populate("owner", "name email role")
      .populate("members.user", "name email role");

    if (io && project) {
      io.to(`project:${projectId}`).emit("project:progress_updated", {
        projectId,
        progress,
        totalTasks: tasks.length,
        doneTasks,
      });
    }
  } catch (err) {
    console.error("Error syncing project progress:", err);
  }
};

// @desc Get all tasks for a project
// @route GET /api/tasks?projectId=xxx
exports.getTasks = async (req, res, next) => {
  try {
    const { projectId, status, assignedTo, priority } = req.query;

    if (!projectId) {
      return res.status(400).json({ success: false, message: "projectId query parameter is required" });
    }

    const filter = { projectId };
    if (status) filter.status = status;
    if (assignedTo) filter.assignedTo = assignedTo;
    if (priority) filter.priority = priority;

    const tasks = await Task.find(filter)
      .populate("assignedTo", "name email role")
      .populate("createdBy", "name email")
      .populate("comments.user", "name email role")
      .populate("attachments.uploadedBy", "name email")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: tasks.length,
      data: tasks,
    });
  } catch (error) {
    next(error);
  }
};

// @desc Get single task by ID
// @route GET /api/tasks/:id
exports.getTaskById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const task = await Task.findById(id)
      .populate("assignedTo", "name email role")
      .populate("createdBy", "name email")
      .populate("comments.user", "name email role")
      .populate("attachments.uploadedBy", "name email");

    if (!task) {
      return res.status(404).json({ success: false, message: "Task not found" });
    }

    res.status(200).json({
      success: true,
      data: task,
    });
  } catch (error) {
    next(error);
  }
};

// @desc Create new task
// @route POST /api/tasks
exports.createTask = async (req, res, next) => {
  try {
    const { projectId, title, description, assignedTo, status, priority, deadline, tags } = req.body;

    if (!projectId) {
      return res.status(400).json({ success: false, message: "projectId is required" });
    }
    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, message: "Task title is required" });
    }

    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ success: false, message: "Project not found" });
    }

    const task = await Task.create({
      projectId,
      title: title.trim(),
      description: description ? description.trim() : "",
      assignedTo: assignedTo || null,
      status: status || "TODO",
      priority: priority || "MEDIUM",
      deadline: deadline || null,
      progress: status === "DONE" ? 100 : 0,
      tags: Array.isArray(tags) ? tags : [],
      createdBy: req.user._id,
      version: 1,
    });

    const populatedTask = await Task.findById(task._id)
      .populate("assignedTo", "name email role")
      .populate("createdBy", "name email")
      .populate("comments.user", "name email role")
      .populate("attachments.uploadedBy", "name email");

    const io = req.app.get("io");
    if (io) {
      io.to(`project:${projectId}`).emit("task:created", populatedTask);
    }

    await syncProjectProgress(projectId, io);

    res.status(201).json({
      success: true,
      message: "Task created successfully",
      data: populatedTask,
    });
  } catch (error) {
    next(error);
  }
};

// @desc Update task with Optimistic Concurrency Control
// @route PUT /api/tasks/:id
exports.updateTask = async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      title,
      description,
      assignedTo,
      status,
      priority,
      deadline,
      progress,
      tags,
      expectedVersion,
    } = req.body;

    const task = await Task.findById(id);
    if (!task) {
      return res.status(404).json({ success: false, message: "Task not found" });
    }

    // Safe handling of simultaneous updates: Optimistic Concurrency Control
    if (expectedVersion !== undefined && expectedVersion !== null && Number(expectedVersion) !== task.version) {
      const currentTask = await Task.findById(id)
        .populate("assignedTo", "name email role")
        .populate("createdBy", "name email")
        .populate("comments.user", "name email role")
        .populate("attachments.uploadedBy", "name email");

      return res.status(409).json({
        success: false,
        code: "CONCURRENCY_CONFLICT",
        message:
          "Conflict: This task was modified by another collaborator while you were editing. Please review the updated version before saving.",
        currentTask,
      });
    }

    // Apply updates
    if (title) task.title = title.trim();
    if (description !== undefined) task.description = description.trim();
    if (assignedTo !== undefined) task.assignedTo = assignedTo || null;
    if (status) {
      task.status = status;
      if (status === "DONE" && (progress === undefined || progress === 0)) {
        task.progress = 100;
      }
    }
    if (priority) task.priority = priority;
    if (deadline !== undefined) task.deadline = deadline || null;
    if (progress !== undefined) task.progress = Number(progress);
    if (tags !== undefined) task.tags = Array.isArray(tags) ? tags : [];

    // Increment version
    task.version += 1;
    await task.save();

    const populatedTask = await Task.findById(task._id)
      .populate("assignedTo", "name email role")
      .populate("createdBy", "name email")
      .populate("comments.user", "name email role")
      .populate("attachments.uploadedBy", "name email");

    const io = req.app.get("io");
    if (io) {
      io.to(`project:${task.projectId}`).emit("task:updated", populatedTask);
    }

    await syncProjectProgress(task.projectId, io);

    res.status(200).json({
      success: true,
      message: "Task updated successfully",
      data: populatedTask,
    });
  } catch (error) {
    next(error);
  }
};

// @desc Update task status (Kanban / quick status change with optimistic locking)
// @route PATCH /api/tasks/:id/status
exports.updateTaskStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, expectedVersion } = req.body;

    if (!status || !["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"].includes(status)) {
      return res.status(400).json({ success: false, message: "Valid status is required" });
    }

    const task = await Task.findById(id);
    if (!task) {
      return res.status(404).json({ success: false, message: "Task not found" });
    }

    if (expectedVersion !== undefined && expectedVersion !== null && Number(expectedVersion) !== task.version) {
      const currentTask = await Task.findById(id)
        .populate("assignedTo", "name email role")
        .populate("createdBy", "name email")
        .populate("comments.user", "name email role")
        .populate("attachments.uploadedBy", "name email");

      return res.status(409).json({
        success: false,
        code: "CONCURRENCY_CONFLICT",
        message: "Conflict: This task was modified by another collaborator. Status not changed.",
        currentTask,
      });
    }

    task.status = status;
    if (status === "DONE") {
      task.progress = 100;
    } else if (task.progress === 100 && status !== "DONE") {
      task.progress = 50;
    }
    task.version += 1;
    await task.save();

    const populatedTask = await Task.findById(task._id)
      .populate("assignedTo", "name email role")
      .populate("createdBy", "name email")
      .populate("comments.user", "name email role")
      .populate("attachments.uploadedBy", "name email");

    const io = req.app.get("io");
    if (io) {
      io.to(`project:${task.projectId}`).emit("task:status_changed", populatedTask);
    }

    await syncProjectProgress(task.projectId, io);

    res.status(200).json({
      success: true,
      message: `Task status updated to ${status}`,
      data: populatedTask,
    });
  } catch (error) {
    next(error);
  }
};

// @desc Assign task to a user
// @route PATCH /api/tasks/:id/assign
exports.assignTask = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { assignedTo, expectedVersion } = req.body;

    const task = await Task.findById(id);
    if (!task) {
      return res.status(404).json({ success: false, message: "Task not found" });
    }

    if (expectedVersion !== undefined && expectedVersion !== null && Number(expectedVersion) !== task.version) {
      const currentTask = await Task.findById(id)
        .populate("assignedTo", "name email role")
        .populate("createdBy", "name email");

      return res.status(409).json({
        success: false,
        code: "CONCURRENCY_CONFLICT",
        message: "Conflict: This task was modified by another user.",
        currentTask,
      });
    }

    task.assignedTo = assignedTo || null;
    task.version += 1;
    await task.save();

    const populatedTask = await Task.findById(task._id)
      .populate("assignedTo", "name email role")
      .populate("createdBy", "name email")
      .populate("comments.user", "name email role")
      .populate("attachments.uploadedBy", "name email");

    const io = req.app.get("io");
    if (io) {
      io.to(`project:${task.projectId}`).emit("task:assigned", populatedTask);
    }

    res.status(200).json({
      success: true,
      message: "Task assignment updated",
      data: populatedTask,
    });
  } catch (error) {
    next(error);
  }
};

// @desc Add comment to task
// @route POST /api/tasks/:id/comments
exports.addComment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { text } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({ success: false, message: "Comment text is required" });
    }

    const task = await Task.findById(id);
    if (!task) {
      return res.status(404).json({ success: false, message: "Task not found" });
    }

    task.comments.push({
      user: req.user._id,
      text: text.trim(),
      createdAt: new Date(),
    });

    await task.save();

    const populatedTask = await Task.findById(task._id)
      .populate("assignedTo", "name email role")
      .populate("createdBy", "name email")
      .populate("comments.user", "name email role")
      .populate("attachments.uploadedBy", "name email");

    const newComment = populatedTask.comments[populatedTask.comments.length - 1];

    const io = req.app.get("io");
    if (io) {
      io.to(`project:${task.projectId}`).emit("task:comment_added", {
        taskId: task._id,
        comment: newComment,
        task: populatedTask,
      });
    }

    res.status(201).json({
      success: true,
      message: "Comment added",
      data: populatedTask,
    });
  } catch (error) {
    next(error);
  }
};

// @desc Add file attachment to task
// @route POST /api/tasks/:id/attachments
exports.addAttachment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, url, size, fileType } = req.body;

    if (!name || !url) {
      return res.status(400).json({ success: false, message: "File name and URL/content are required" });
    }

    const task = await Task.findById(id);
    if (!task) {
      return res.status(404).json({ success: false, message: "Task not found" });
    }

    task.attachments.push({
      name: name.trim(),
      url,
      size: Number(size) || 0,
      fileType: fileType || "file",
      uploadedBy: req.user._id,
      uploadedAt: new Date(),
    });

    await task.save();

    const populatedTask = await Task.findById(task._id)
      .populate("assignedTo", "name email role")
      .populate("createdBy", "name email")
      .populate("comments.user", "name email role")
      .populate("attachments.uploadedBy", "name email");

    const newAttachment = populatedTask.attachments[populatedTask.attachments.length - 1];

    const io = req.app.get("io");
    if (io) {
      io.to(`project:${task.projectId}`).emit("task:file_attached", {
        taskId: task._id,
        attachment: newAttachment,
        task: populatedTask,
      });
    }

    res.status(201).json({
      success: true,
      message: "Attachment added",
      data: populatedTask,
    });
  } catch (error) {
    next(error);
  }
};

// @desc Delete attachment from task
// @route DELETE /api/tasks/:id/attachments/:attachmentId
exports.deleteAttachment = async (req, res, next) => {
  try {
    const { id, attachmentId } = req.params;

    const task = await Task.findById(id);
    if (!task) {
      return res.status(404).json({ success: false, message: "Task not found" });
    }

    task.attachments = task.attachments.filter(
      (a) => String(a._id) !== String(attachmentId)
    );

    await task.save();

    const populatedTask = await Task.findById(task._id)
      .populate("assignedTo", "name email role")
      .populate("createdBy", "name email")
      .populate("comments.user", "name email role")
      .populate("attachments.uploadedBy", "name email");

    const io = req.app.get("io");
    if (io) {
      io.to(`project:${task.projectId}`).emit("task:file_deleted", {
        taskId: task._id,
        attachmentId,
        task: populatedTask,
      });
    }

    res.status(200).json({
      success: true,
      message: "Attachment removed",
      data: populatedTask,
    });
  } catch (error) {
    next(error);
  }
};

// @desc Delete task
// @route DELETE /api/tasks/:id
exports.deleteTask = async (req, res, next) => {
  try {
    const { id } = req.params;
    const task = await Task.findById(id);
    if (!task) {
      return res.status(404).json({ success: false, message: "Task not found" });
    }

    const projectId = task.projectId;
    await Task.findByIdAndDelete(id);

    const io = req.app.get("io");
    if (io) {
      io.to(`project:${projectId}`).emit("task:deleted", { taskId: id, projectId });
    }

    await syncProjectProgress(projectId, io);

    res.status(200).json({
      success: true,
      message: "Task deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};
