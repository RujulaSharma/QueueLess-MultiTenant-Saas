import { useEffect, useState, useMemo, useCallback } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Plus,
  Calendar,
  Clock,
  User,
  Users,
  MessageSquare,
  Paperclip,
  CheckCircle2,
  AlertTriangle,
  Send,
  Trash2,
  Edit3,
  X,
  Radio,
  FileText,
  UploadCloud,
  ChevronRight,
  ChevronLeft,
  MoreVertical,
  LayoutGrid,
  List as ListIcon,
  Tag,
  CheckSquare,
} from "lucide-react";
import {
  getProjectById,
  updateProject,
  deleteProject,
  addProjectMember,
  removeProjectMember,
  getCollaborators,
  createTask,
  updateTask,
  updateTaskStatus,
  addTaskComment,
  addTaskAttachment,
  deleteTaskAttachment,
  deleteTask,
} from "../services/projectApi";
import useProjectRealtime from "../hooks/useProjectRealtime";
import { useAuth } from "../context/AuthContext";

const COLUMNS = [
  { id: "TODO", title: "To Do", color: "var(--text-muted)", bg: "var(--cream-light)", border: "var(--border-subtle)" },
  { id: "IN_PROGRESS", title: "In Progress", color: "var(--primary-green)", bg: "var(--pistachio-light)", border: "var(--border-green)" },
  { id: "IN_REVIEW", title: "In Review", color: "var(--warning)", bg: "var(--warning-bg)", border: "var(--peach-border)" },
  { id: "DONE", title: "Completed", color: "var(--success)", bg: "var(--success-bg)", border: "var(--success-border)" },
];

export default function ProjectDetails() {
  const { id: projectId } = useParams();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();

  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [collaborators, setCollaborators] = useState([]);
  const [viewMode, setViewMode] = useState("board"); // "board" or "list"

  // Live real-time pulse
  const [livePulse, setLivePulse] = useState(false);

  // New Task Modal
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [newTask, setNewTask] = useState({
    title: "",
    description: "",
    priority: "MEDIUM",
    status: "TODO",
    assignedTo: "",
    deadline: "",
  });
  const [taskSubmitting, setTaskSubmitting] = useState(false);

  // Task Details / Drawer Modal
  const [activeTask, setActiveTask] = useState(null);
  const [taskEditForm, setTaskEditForm] = useState(null);
  const [concurrencyConflict, setConcurrencyConflict] = useState("");
  const [savingTask, setSavingTask] = useState(false);

  // Comments State
  const [commentText, setCommentText] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);

  // Attachments State
  const [showAttachModal, setShowAttachModal] = useState(false);
  const [attachmentName, setAttachmentName] = useState("");
  const [attachmentUrl, setAttachmentUrl] = useState("");
  const [uploadingAttachment, setUploadingAttachment] = useState(false);

  // Add Member Modal
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [selectedUserEmail, setSelectedUserEmail] = useState("");
  const [memberRole, setMemberRole] = useState("MEMBER");
  const [addingMember, setAddingMember] = useState(false);

  // Load project and collaborator list
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const [projRes, collabRes] = await Promise.all([
        getProjectById(projectId),
        getCollaborators().catch(() => ({ data: [] })),
      ]);
      setProject(projRes.data || null);
      setTasks(projRes.data?.tasks || []);
      setCollaborators(collabRes.data || []);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load project details.");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Real-time Event Handler
  const handleRealtimeEvent = useCallback(
    (eventName, payload) => {
      setLivePulse(true);
      setTimeout(() => setLivePulse(false), 2000);

      switch (eventName) {
        case "project:updated":
          setProject((prev) => (prev ? { ...prev, ...payload } : payload));
          break;

        case "project:deleted":
          navigate("/workspace");
          break;

        case "project:progress_updated":
          setProject((prev) =>
            prev ? { ...prev, progress: payload.progress, doneTasks: payload.doneTasks, totalTasks: payload.totalTasks } : prev
          );
          break;

        case "task:created":
          setTasks((prev) => {
            if (prev.some((t) => t._id === payload._id)) return prev;
            return [payload, ...prev];
          });
          break;

        case "task:updated":
        case "task:status_changed":
        case "task:assigned":
          setTasks((prev) =>
            prev.map((t) => (t._id === payload._id ? payload : t))
          );
          // If active task is open in modal, update it if version is higher
          setActiveTask((prev) => {
            if (prev && prev._id === payload._id) {
              if (taskEditForm && taskEditForm.version < payload.version) {
                setConcurrencyConflict(
                  "Notice: This task was just updated by another collaborator in real-time. The latest updates are shown below."
                );
              }
              setTaskEditForm(payload);
              return payload;
            }
            return prev;
          });
          break;

        case "task:comment_added":
          setTasks((prev) =>
            prev.map((t) => {
              if (t._id === payload.taskId) {
                const existing = t.comments || [];
                return { ...t, comments: [...existing, payload.comment] };
              }
              return t;
            })
          );
          setActiveTask((prev) => {
            if (prev && prev._id === payload.taskId) {
              const updatedComments = [...(prev.comments || []), payload.comment];
              return { ...prev, comments: updatedComments };
            }
            return prev;
          });
          break;

        case "task:file_attached":
          setTasks((prev) =>
            prev.map((t) => {
              if (t._id === payload.taskId) {
                return { ...t, attachments: [...(t.attachments || []), payload.attachment] };
              }
              return t;
            })
          );
          setActiveTask((prev) => {
            if (prev && prev._id === payload.taskId) {
              return { ...prev, attachments: [...(prev.attachments || []), payload.attachment] };
            }
            return prev;
          });
          break;

        case "task:file_deleted":
          setTasks((prev) =>
            prev.map((t) => {
              if (t._id === payload.taskId) {
                return {
                  ...t,
                  attachments: (t.attachments || []).filter((a) => a._id !== payload.attachmentId),
                };
              }
              return t;
            })
          );
          setActiveTask((prev) => {
            if (prev && prev._id === payload.taskId) {
              return {
                ...prev,
                attachments: (prev.attachments || []).filter((a) => a._id !== payload.attachmentId),
              };
            }
            return prev;
          });
          break;

        case "task:deleted":
          setTasks((prev) => prev.filter((t) => t._id !== payload.taskId));
          setActiveTask((prev) => (prev && prev._id === payload.taskId ? null : prev));
          break;

        default:
          break;
      }
    },
    [navigate, taskEditForm]
  );

  // Connect project socket room
  useProjectRealtime(projectId, handleRealtimeEvent);

  // Handle Quick Status Move (Kanban buttons)
  const handleQuickStatusChange = async (task, newStatus) => {
    try {
      const res = await updateTaskStatus(task._id, newStatus, task.version);
      if (res.data) {
        setTasks((prev) =>
          prev.map((t) => (t._id === task._id ? res.data : t))
        );
      }
    } catch (err) {
      if (err?.response?.status === 409) {
        alert(
          "⚠️ Concurrency Conflict: This task was modified by another collaborator. Refreshing board state..."
        );
        loadData();
      } else {
        alert(err?.response?.data?.message || "Failed to update task status.");
      }
    }
  };

  // Handle Save Task in Modal (with Optimistic Concurrency Control)
  const handleSaveTaskEdit = async (e) => {
    e.preventDefault();
    if (!taskEditForm) return;

    try {
      setSavingTask(true);
      setConcurrencyConflict("");
      const res = await updateTask(taskEditForm._id, {
        title: taskEditForm.title,
        description: taskEditForm.description,
        status: taskEditForm.status,
        priority: taskEditForm.priority,
        assignedTo: taskEditForm.assignedTo?._id || taskEditForm.assignedTo || null,
        deadline: taskEditForm.deadline,
        progress: taskEditForm.progress,
        expectedVersion: taskEditForm.version,
      });

      if (res.data) {
        setActiveTask(res.data);
        setTaskEditForm(res.data);
        setTasks((prev) =>
          prev.map((t) => (t._id === res.data._id ? res.data : t))
        );
      }
    } catch (err) {
      if (err?.response?.status === 409 || err?.response?.data?.code === "CONCURRENCY_CONFLICT") {
        const latestTask = err?.response?.data?.currentTask;
        setConcurrencyConflict(
          "⚠️ Concurrency Conflict: Another collaborator has modified this task. We've loaded the latest data to prevent overwriting."
        );
        if (latestTask) {
          setActiveTask(latestTask);
          setTaskEditForm(latestTask);
          setTasks((prev) =>
            prev.map((t) => (t._id === latestTask._id ? latestTask : t))
          );
        }
      } else {
        alert(err?.response?.data?.message || "Failed to update task.");
      }
    } finally {
      setSavingTask(false);
    }
  };

  const openTaskDrawer = (task) => {
    setActiveTask(task);
    setTaskEditForm({ ...task });
    setConcurrencyConflict("");
  };

  const handleCreateTask = async (e) => {
    e.preventDefault();
    if (!newTask.title.trim()) return;

    try {
      setTaskSubmitting(true);
      const res = await createTask({
        projectId,
        title: newTask.title,
        description: newTask.description,
        priority: newTask.priority,
        status: newTask.status,
        assignedTo: newTask.assignedTo || null,
        deadline: newTask.deadline || null,
      });

      if (res.data) {
        setTasks((prev) => [res.data, ...prev]);
        setShowTaskModal(false);
        setNewTask({
          title: "",
          description: "",
          priority: "MEDIUM",
          status: "TODO",
          assignedTo: "",
          deadline: "",
        });
      }
    } catch (err) {
      alert(err?.response?.data?.message || "Failed to create task.");
    } finally {
      setTaskSubmitting(false);
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim() || !activeTask) return;

    try {
      setSubmittingComment(true);
      const res = await addTaskComment(activeTask._id, commentText);
      if (res.data) {
        setActiveTask(res.data);
        setTasks((prev) =>
          prev.map((t) => (t._id === res.data._id ? res.data : t))
        );
        setCommentText("");
      }
    } catch (err) {
      alert(err?.response?.data?.message || "Failed to add comment.");
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleAddAttachment = async (e) => {
    e.preventDefault();
    if (!attachmentName.trim() || !attachmentUrl.trim() || !activeTask) return;

    try {
      setUploadingAttachment(true);
      const res = await addTaskAttachment(activeTask._id, {
        name: attachmentName.trim(),
        url: attachmentUrl.trim(),
        fileType: attachmentUrl.startsWith("data:") ? "uploaded_file" : "link",
        size: attachmentUrl.length,
      });

      if (res.data) {
        setActiveTask(res.data);
        setTasks((prev) =>
          prev.map((t) => (t._id === res.data._id ? res.data : t))
        );
        setShowAttachModal(false);
        setAttachmentName("");
        setAttachmentUrl("");
      }
    } catch (err) {
      alert(err?.response?.data?.message || "Failed to add attachment.");
    } finally {
      setUploadingAttachment(false);
    }
  };

  const handleLocalFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setAttachmentName(file.name);
    const reader = new FileReader();
    reader.onload = (loadEvt) => {
      setAttachmentUrl(loadEvt.target.result);
    };
    reader.readAsDataURL(file);
  };

  const handleDeleteAttachment = async (attachmentId) => {
    if (!activeTask) return;
    try {
      const res = await deleteTaskAttachment(activeTask._id, attachmentId);
      if (res.data) {
        setActiveTask(res.data);
        setTasks((prev) =>
          prev.map((t) => (t._id === res.data._id ? res.data : t))
        );
      }
    } catch (err) {
      alert(err?.response?.data?.message || "Failed to remove attachment.");
    }
  };

  const handleDeleteTask = async (taskId) => {
    if (!window.confirm("Are you sure you want to delete this task?")) return;
    try {
      await deleteTask(taskId);
      setTasks((prev) => prev.filter((t) => t._id !== taskId));
      setActiveTask(null);
    } catch (err) {
      alert(err?.response?.data?.message || "Failed to delete task.");
    }
  };

  const handleAddMember = async (e) => {
    e.preventDefault();
    if (!selectedUserEmail.trim()) return;

    try {
      setAddingMember(true);
      const res = await addProjectMember(projectId, {
        email: selectedUserEmail.trim(),
        role: memberRole,
      });
      if (res.data) {
        setProject(res.data);
        setShowMemberModal(false);
        setSelectedUserEmail("");
      }
    } catch (err) {
      alert(err?.response?.data?.message || "Failed to add member.");
    } finally {
      setAddingMember(false);
    }
  };

  const tasksByColumn = useMemo(() => {
    const groups = { TODO: [], IN_PROGRESS: [], IN_REVIEW: [], DONE: [] };
    tasks.forEach((t) => {
      if (groups[t.status]) {
        groups[t.status].push(t);
      } else {
        groups.TODO.push(t);
      }
    });
    return groups;
  }, [tasks]);

  if (loading) {
    return (
      <div style={{ padding: "60px 20px", textAlign: "center", color: "var(--text-muted)" }}>
        <p>Loading project workspace...</p>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div style={{ padding: "30px", maxWidth: "800px", margin: "0 auto" }}>
        <div className="error-box page-error">
          <AlertTriangle size={20} />
          <div>
            <strong>Unable to load project</strong>
            <p style={{ margin: "4px 0 0" }}>{error || "Project not found or you don't have access."}</p>
          </div>
        </div>
        <Link to="/workspace" className="button primary" style={{ marginTop: "12px", display: "inline-flex" }}>
          Return to Workspace
        </Link>
      </div>
    );
  }

  return (
    <div className="project-board-view" style={{ maxWidth: "1600px", margin: "0 auto" }}>
      {/* Top Breadcrumb & Live indicator */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "16px",
          flexWrap: "wrap",
          gap: "10px",
        }}
      >
        <Link
          to="/workspace"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            color: "var(--primary-forest)",
            fontWeight: "700",
            fontSize: "13.5px",
            textDecoration: "none",
          }}
        >
          <ArrowLeft size={16} />
          Back to Projects
        </Link>

        {/* Real-time sync badge */}
        <div
          className={`live-pill ${livePulse ? "online" : ""}`}
        >
          <Radio size={13} />
          <span>{livePulse ? "Live Room Update" : "Collaborative Board (Active)"}</span>
        </div>
      </div>

      {/* Project Header Card */}
      <div className="panel" style={{ padding: "24px", marginBottom: "24px" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            flexWrap: "wrap",
            gap: "18px",
          }}
        >
          <div style={{ flex: "1 1 480px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px", flexWrap: "wrap" }}>
              <span
                style={{
                  fontSize: "11px",
                  fontWeight: "750",
                  textTransform: "uppercase",
                  padding: "3px 8px",
                  borderRadius: "6px",
                  background: "var(--pistachio-soft)",
                  color: "var(--primary-forest)",
                  border: "1px solid var(--border-green)",
                }}
              >
                {project.category || "General"}
              </span>
              <span
                className={`badge ${
                  project.priority === "URGENT"
                    ? "badge-danger"
                    : project.priority === "HIGH"
                    ? "badge-warning"
                    : "badge-info"
                }`}
              >
                {project.priority} Priority
              </span>
              <span
                className={`badge ${
                  project.status === "COMPLETED"
                    ? "badge-success"
                    : project.status === "IN_PROGRESS"
                    ? "badge-info"
                    : "badge-secondary"
                }`}
              >
                {project.status}
              </span>
            </div>

            <h1 style={{ fontSize: "24px", fontWeight: "800", margin: "0 0 8px", color: "var(--text-primary)" }}>
              {project.name}
            </h1>
            <p style={{ color: "var(--text-muted)", fontSize: "14px", margin: 0, lineHeight: 1.5 }}>
              {project.description || "Collaborative workspace for project execution and tracking."}
            </p>
          </div>

          {/* Action Buttons & Members */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "12px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
              <button
                className="button primary"
                onClick={() => setShowTaskModal(true)}
              >
                <Plus size={16} />
                Add Task
              </button>
              <button
                className="button secondary"
                onClick={() => setShowMemberModal(true)}
              >
                <Users size={16} />
                Invite Member
              </button>
            </div>

            {/* Members Avatars Row */}
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "12px", color: "var(--text-muted)", fontWeight: "600" }}>Team:</span>
              <div style={{ display: "flex" }}>
                {(project.members || []).map((m, idx) => (
                  <div
                    key={m.user?._id || idx}
                    title={`${m.user?.name || "Member"} (${m.role})`}
                    style={{
                      width: "28px",
                      height: "28px",
                      borderRadius: "50%",
                      background: "var(--primary-forest)",
                      color: "#ffffff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "11px",
                      fontWeight: "750",
                      border: "2px solid var(--warm-cream)",
                      marginLeft: idx > 0 ? "-6px" : "0",
                    }}
                  >
                    {m.user?.name ? m.user.name.charAt(0).toUpperCase() : "U"}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Progress & Deadline metrics bar */}
        <div
          style={{
            marginTop: "20px",
            paddingTop: "18px",
            borderTop: "1px solid var(--border-subtle)",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "16px",
            alignItems: "center",
          }}
        >
          <div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: "12px",
                fontWeight: "650",
                color: "var(--primary-forest)",
                marginBottom: "6px",
              }}
            >
              <span>Project Progress</span>
              <span>{project.progress || 0}%</span>
            </div>
            <div
              style={{
                width: "100%",
                height: "7px",
                background: "var(--pistachio-light)",
                borderRadius: "var(--radius-pill)",
                overflow: "hidden",
                border: "1px solid var(--border-green)",
              }}
            >
              <div
                style={{
                  width: `${project.progress || 0}%`,
                  height: "100%",
                  background:
                    project.progress === 100
                      ? "var(--success)"
                      : "linear-gradient(90deg, var(--primary-green) 0%, var(--primary-forest) 100%)",
                  borderRadius: "var(--radius-pill)",
                  transition: "width 0.4s ease",
                }}
              />
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--text-muted)", fontSize: "13px" }}>
            <Calendar size={15} style={{ color: "var(--primary-forest)" }} />
            <span>
              Target Deadline:{" "}
              <strong>
                {project.deadline ? new Date(project.deadline).toLocaleDateString() : "No date set"}
              </strong>
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--text-muted)", fontSize: "13px" }}>
            <CheckSquare size={15} style={{ color: "var(--primary-green)" }} />
            <span>
              Task Summary:{" "}
              <strong>
                {tasks.filter((t) => t.status === "DONE").length} / {tasks.length} Completed
              </strong>
            </span>
          </div>

          {/* View switcher */}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "4px" }}>
            <button
              onClick={() => setViewMode("board")}
              className={`button ${viewMode === "board" ? "primary small" : "secondary small"}`}
            >
              <LayoutGrid size={13} />
              Board
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`button ${viewMode === "list" ? "primary small" : "secondary small"}`}
            >
              <ListIcon size={13} />
              List
            </button>
          </div>
        </div>
      </div>

      {/* Kanban Board View */}
      {viewMode === "board" ? (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: "18px",
            alignItems: "flex-start",
          }}
        >
          {COLUMNS.map((col) => {
            const colTasks = tasksByColumn[col.id] || [];

            return (
              <div
                key={col.id}
                style={{
                  background: "var(--warm-cream)",
                  borderRadius: "var(--radius-card)",
                  border: "1px solid var(--border-subtle)",
                  boxShadow: "var(--shadow-xs)",
                  padding: "16px",
                  minHeight: "450px",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                {/* Column Header */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "14px",
                    paddingBottom: "8px",
                    borderBottom: "2px solid var(--border-subtle)",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <div
                      style={{
                        width: "10px",
                        height: "10px",
                        borderRadius: "50%",
                        background: col.color,
                      }}
                    />
                    <h3 style={{ fontSize: "15px", fontWeight: "750", margin: 0, color: "var(--text-primary)" }}>
                      {col.title}
                    </h3>
                  </div>
                  <span
                    style={{
                      background: "var(--pistachio-soft)",
                      color: "var(--primary-forest)",
                      padding: "2px 8px",
                      borderRadius: "var(--radius-pill)",
                      fontSize: "12px",
                      fontWeight: "750",
                    }}
                  >
                    {colTasks.length}
                  </span>
                </div>

                {/* Task Cards in Column */}
                <div style={{ display: "flex", flexDirection: "column", gap: "10px", flexGrow: 1 }}>
                  {colTasks.map((task) => (
                    <div
                      key={task._id}
                      onClick={() => openTaskDrawer(task)}
                      style={{
                        background: "var(--cream-light)",
                        borderRadius: "var(--radius-md)",
                        border: "1px solid var(--border-subtle)",
                        padding: "14px",
                        boxShadow: "var(--shadow-xs)",
                        cursor: "pointer",
                        transition: "all var(--transition-fast)",
                      }}
                      className="kanban-card"
                    >
                      {/* Priority tag & Quick status buttons */}
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginBottom: "8px",
                        }}
                      >
                        <span
                          className={`badge ${
                            task.priority === "URGENT"
                              ? "badge-danger"
                              : task.priority === "HIGH"
                              ? "badge-warning"
                              : "badge-info"
                          }`}
                        >
                          {task.priority}
                        </span>

                        {/* Quick status transition buttons */}
                        <div
                          style={{ display: "flex", gap: "2px" }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          {col.id !== "TODO" && (
                            <button
                              title="Move back"
                              onClick={() => {
                                const prevStatus =
                                  col.id === "DONE"
                                    ? "IN_REVIEW"
                                    : col.id === "IN_REVIEW"
                                    ? "IN_PROGRESS"
                                    : "TODO";
                                handleQuickStatusChange(task, prevStatus);
                              }}
                              style={{
                                background: "none",
                                border: "none",
                                cursor: "pointer",
                                padding: "2px",
                                color: "var(--text-subtle)",
                              }}
                            >
                              <ChevronLeft size={16} />
                            </button>
                          )}
                          {col.id !== "DONE" && (
                            <button
                              title="Move forward"
                              onClick={() => {
                                const nextStatus =
                                  col.id === "TODO"
                                    ? "IN_PROGRESS"
                                    : col.id === "IN_PROGRESS"
                                    ? "IN_REVIEW"
                                    : "DONE";
                                handleQuickStatusChange(task, nextStatus);
                              }}
                              style={{
                                background: "none",
                                border: "none",
                                cursor: "pointer",
                                padding: "2px",
                                color: "var(--primary-green)",
                              }}
                            >
                              <ChevronRight size={16} />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Title & Description */}
                      <h4
                        style={{
                          fontSize: "14px",
                          fontWeight: "700",
                          color: "var(--text-primary)",
                          margin: "0 0 6px",
                          lineHeight: 1.4,
                        }}
                      >
                        {task.title}
                      </h4>
                      {task.description && (
                        <p
                          style={{
                            fontSize: "12px",
                            color: "var(--text-muted)",
                            margin: "0 0 10px",
                            display: "-webkit-box",
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: "vertical",
                            overflow: "hidden",
                          }}
                        >
                          {task.description}
                        </p>
                      )}

                      {/* Progress bar if in progress */}
                      {task.status !== "DONE" && task.progress > 0 && (
                        <div style={{ marginBottom: "10px" }}>
                          <div
                            style={{
                              width: "100%",
                              height: "4px",
                              background: "var(--border-subtle)",
                              borderRadius: "2px",
                              overflow: "hidden",
                            }}
                          >
                            <div
                              style={{
                                width: `${task.progress}%`,
                                height: "100%",
                                background: "var(--primary-green)",
                              }}
                            />
                          </div>
                        </div>
                      )}

                      {/* Footer: Assignee & Meta counts */}
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          fontSize: "11px",
                          color: "var(--text-muted)",
                          paddingTop: "8px",
                          borderTop: "1px solid var(--border-subtle)",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          {task.assignedTo ? (
                            <div
                              title={`Assigned to: ${task.assignedTo.name}`}
                              style={{
                                width: "22px",
                                height: "22px",
                                borderRadius: "50%",
                                background: "var(--primary-forest)",
                                color: "#ffffff",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: "10px",
                                fontWeight: "750",
                              }}
                            >
                              {task.assignedTo.name.charAt(0).toUpperCase()}
                            </div>
                          ) : (
                            <span style={{ color: "var(--text-subtle)" }}>Unassigned</span>
                          )}
                        </div>

                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          {(task.comments?.length || 0) > 0 && (
                            <span style={{ display: "flex", alignItems: "center", gap: "3px" }}>
                              <MessageSquare size={13} />
                              {task.comments.length}
                            </span>
                          )}
                          {(task.attachments?.length || 0) > 0 && (
                            <span style={{ display: "flex", alignItems: "center", gap: "3px" }}>
                              <Paperclip size={13} />
                              {task.attachments.length}
                            </span>
                          )}
                          {task.deadline && (
                            <span style={{ display: "flex", alignItems: "center", gap: "3px" }}>
                              <Calendar size={13} />
                              {new Date(task.deadline).toLocaleDateString(undefined, {
                                month: "short",
                                day: "numeric",
                              })}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Empty Column State */}
                  {colTasks.length === 0 && (
                    <div
                      style={{
                        border: "1px dashed var(--border-subtle)",
                        borderRadius: "var(--radius-md)",
                        padding: "24px 12px",
                        textAlign: "center",
                        color: "var(--text-subtle)",
                        fontSize: "12px",
                      }}
                    >
                      No tasks in this stage
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* List / Table View */
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Task Title</th>
                <th>Status</th>
                <th>Priority</th>
                <th>Assignee</th>
                <th>Deadline</th>
                <th>Progress</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map((task) => (
                <tr
                  key={task._id}
                  style={{ cursor: "pointer" }}
                  onClick={() => openTaskDrawer(task)}
                >
                  <td style={{ fontWeight: "700", color: "var(--text-primary)" }}>{task.title}</td>
                  <td>
                    <span
                      className={`badge ${
                        task.status === "DONE"
                          ? "badge-success"
                          : task.status === "IN_PROGRESS"
                          ? "badge-info"
                          : task.status === "IN_REVIEW"
                          ? "badge-warning"
                          : "badge-secondary"
                      }`}
                    >
                      {task.status}
                    </span>
                  </td>
                  <td>
                    <span
                      className={`badge ${
                        task.priority === "URGENT"
                          ? "badge-danger"
                          : task.priority === "HIGH"
                          ? "badge-warning"
                          : "badge-info"
                      }`}
                    >
                      {task.priority}
                    </span>
                  </td>
                  <td style={{ color: "var(--text-muted)" }}>
                    {task.assignedTo?.name || "Unassigned"}
                  </td>
                  <td style={{ color: "var(--text-muted)" }}>
                    {task.deadline ? new Date(task.deadline).toLocaleDateString() : "-"}
                  </td>
                  <td>{task.progress || 0}%</td>
                  <td>
                    <button
                      className="button secondary small"
                      onClick={(e) => {
                        e.stopPropagation();
                        openTaskDrawer(task);
                      }}
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Task Drawer / Edit Modal */}
      {activeTask && taskEditForm && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(23, 35, 31, 0.45)",
            backdropFilter: "blur(4px)",
            display: "flex",
            justifyContent: "flex-end",
            zIndex: 1000,
          }}
          onClick={() => setActiveTask(null)}
        >
          <div
            style={{
              background: "var(--warm-cream)",
              width: "100%",
              maxWidth: "680px",
              height: "100%",
              boxShadow: "var(--shadow-modal)",
              display: "flex",
              flexDirection: "column",
              overflowY: "auto",
              borderLeft: "1px solid var(--border-subtle)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer Header */}
            <div
              style={{
                padding: "20px 24px",
                borderBottom: "1px solid var(--border-subtle)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                position: "sticky",
                top: 0,
                background: "var(--warm-cream)",
                zIndex: 10,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span className="badge badge-secondary">
                  Version {taskEditForm.version || 1}
                </span>
                <h3 style={{ fontSize: "18px", fontWeight: "750", margin: 0, color: "var(--text-primary)" }}>
                  Task Details & Collaboration
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setActiveTask(null)}
                style={{ color: "var(--text-muted)" }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Concurrency Conflict Banner */}
            {concurrencyConflict && (
              <div className="error-box page-error" style={{ margin: "16px 24px 0" }}>
                <AlertTriangle size={18} style={{ flexShrink: 0 }} />
                <div>
                  <strong>Safe Concurrency Alert</strong>
                  <p style={{ margin: "2px 0 0" }}>{concurrencyConflict}</p>
                </div>
              </div>
            )}

            {/* Drawer Content Body */}
            <div style={{ padding: "24px", flexGrow: 1 }}>
              {/* Task Edit Form */}
              <form onSubmit={handleSaveTaskEdit} style={{ marginBottom: "28px" }}>
                <div className="field">
                  <label>Task Title *</label>
                  <input
                    type="text"
                    required
                    value={taskEditForm.title}
                    onChange={(e) => setTaskEditForm({ ...taskEditForm, title: e.target.value })}
                  />
                </div>

                <div className="field">
                  <label>Description</label>
                  <textarea
                    rows={3}
                    value={taskEditForm.description}
                    onChange={(e) => setTaskEditForm({ ...taskEditForm, description: e.target.value })}
                  />
                </div>

                {/* Status, Priority, Assignee Grid */}
                <div className="form-two">
                  <div className="field">
                    <label>Status</label>
                    <select
                      value={taskEditForm.status}
                      onChange={(e) => setTaskEditForm({ ...taskEditForm, status: e.target.value })}
                    >
                      <option value="TODO">To Do</option>
                      <option value="IN_PROGRESS">In Progress</option>
                      <option value="IN_REVIEW">In Review</option>
                      <option value="DONE">Completed</option>
                    </select>
                  </div>

                  <div className="field">
                    <label>Priority</label>
                    <select
                      value={taskEditForm.priority}
                      onChange={(e) => setTaskEditForm({ ...taskEditForm, priority: e.target.value })}
                    >
                      <option value="LOW">Low</option>
                      <option value="MEDIUM">Medium</option>
                      <option value="HIGH">High</option>
                      <option value="URGENT">Urgent</option>
                    </select>
                  </div>
                </div>

                <div className="form-two">
                  <div className="field">
                    <label>Assignee</label>
                    <select
                      value={taskEditForm.assignedTo?._id || taskEditForm.assignedTo || ""}
                      onChange={(e) => setTaskEditForm({ ...taskEditForm, assignedTo: e.target.value })}
                    >
                      <option value="">Unassigned</option>
                      {(project.members || []).map((m) => (
                        <option key={m.user?._id} value={m.user?._id}>
                          {m.user?.name} ({m.role})
                        </option>
                      ))}
                      {collaborators
                        .filter(
                          (c) => !(project.members || []).some((m) => m.user?._id === c._id)
                        )
                        .map((c) => (
                          <option key={c._id} value={c._id}>
                            {c.name} ({c.email})
                          </option>
                        ))}
                    </select>
                  </div>

                  <div className="field">
                    <label>Deadline</label>
                    <input
                      type="date"
                      value={taskEditForm.deadline ? taskEditForm.deadline.substring(0, 10) : ""}
                      onChange={(e) => setTaskEditForm({ ...taskEditForm, deadline: e.target.value })}
                    />
                  </div>
                </div>

                {/* Progress Slider */}
                <div style={{ marginBottom: "18px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", fontWeight: "650", marginBottom: "6px" }}>
                    <span>Task Progress</span>
                    <span>{taskEditForm.progress || 0}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={taskEditForm.progress || 0}
                    onChange={(e) => setTaskEditForm({ ...taskEditForm, progress: Number(e.target.value) })}
                    style={{ width: "100%", accentColor: "var(--primary-green)", cursor: "pointer" }}
                  />
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <button
                    type="button"
                    className="button danger"
                    onClick={() => handleDeleteTask(taskEditForm._id)}
                  >
                    <Trash2 size={15} />
                    Delete Task
                  </button>

                  <button
                    type="submit"
                    className="button primary"
                    disabled={savingTask}
                  >
                    {savingTask ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </form>

              {/* Attachments Section */}
              <div
                style={{
                  marginBottom: "28px",
                  paddingTop: "20px",
                  borderTop: "1px solid var(--border-subtle)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "12px",
                  }}
                >
                  <h4 style={{ fontSize: "15px", fontWeight: "750", margin: 0, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "6px" }}>
                    <Paperclip size={16} />
                    Files & Attachments ({(activeTask.attachments || []).length})
                  </h4>
                  <button
                    type="button"
                    className="button secondary small"
                    onClick={() => setShowAttachModal(true)}
                  >
                    + Add File
                  </button>
                </div>

                {(activeTask.attachments || []).length === 0 ? (
                  <p style={{ fontSize: "13px", color: "var(--text-subtle)", fontStyle: "italic", margin: 0 }}>
                    No files or links attached yet.
                  </p>
                ) : (
                  <div style={{ display: "grid", gap: "8px" }}>
                    {activeTask.attachments.map((att) => (
                      <div
                        key={att._id}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          padding: "10px 14px",
                          borderRadius: "var(--radius-md)",
                          border: "1px solid var(--border-subtle)",
                          background: "var(--cream-light)",
                          fontSize: "13px",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <FileText size={16} style={{ color: "var(--primary-forest)" }} />
                          <a
                            href={att.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            download={att.name}
                            style={{ fontWeight: "700", color: "var(--primary-forest)", textDecoration: "underline" }}
                          >
                            {att.name}
                          </a>
                          <span style={{ fontSize: "11px", color: "var(--text-subtle)" }}>
                            by {att.uploadedBy?.name || "User"}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeleteAttachment(att._id)}
                          style={{
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                            color: "var(--text-subtle)",
                          }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Real-time Comments Thread */}
              <div
                style={{
                  paddingTop: "20px",
                  borderTop: "1px solid var(--border-subtle)",
                }}
              >
                <h4
                  style={{
                    fontSize: "15px",
                    fontWeight: "750",
                    margin: "0 0 14px",
                    color: "var(--text-primary)",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  <MessageSquare size={16} />
                  Comments & Activity ({(activeTask.comments || []).length})
                </h4>

                {/* Comments List */}
                <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "16px" }}>
                  {(activeTask.comments || []).map((c, idx) => (
                    <div
                      key={c._id || idx}
                      style={{
                        padding: "10px 14px",
                        borderRadius: "var(--radius-md)",
                        background: "var(--cream-light)",
                        border: "1px solid var(--border-subtle)",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginBottom: "4px",
                          fontSize: "12px",
                        }}
                      >
                        <strong style={{ color: "var(--text-primary)" }}>{c.user?.name || "Team Member"}</strong>
                        <span style={{ color: "var(--text-subtle)" }}>
                          {new Date(c.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                      <p style={{ margin: 0, fontSize: "13px", color: "var(--text-muted)", lineHeight: 1.4 }}>
                        {c.text}
                      </p>
                    </div>
                  ))}

                  {(activeTask.comments || []).length === 0 && (
                    <p style={{ fontSize: "13px", color: "var(--text-subtle)", fontStyle: "italic", margin: 0 }}>
                      No comments yet. Start the conversation!
                    </p>
                  )}
                </div>

                {/* Add Comment Input */}
                <form onSubmit={handleAddComment} style={{ display: "flex", gap: "8px" }}>
                  <input
                    type="text"
                    placeholder="Write a comment..."
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    style={{
                      flexGrow: 1,
                      fontSize: "13px",
                    }}
                  />
                  <button
                    type="submit"
                    className="button primary"
                    disabled={submittingComment || !commentText.trim()}
                    style={{ padding: "8px 16px" }}
                  >
                    <Send size={14} />
                    Post
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Task Modal */}
      {showTaskModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(23, 35, 31, 0.45)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "16px",
          }}
        >
          <div
            className="panel"
            style={{
              maxWidth: "500px",
              width: "100%",
              padding: "26px",
              boxShadow: "var(--shadow-modal)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "18px",
              }}
            >
              <h2 style={{ fontSize: "18px", fontWeight: "750", margin: 0, color: "var(--text-primary)" }}>
                Add New Task
              </h2>
              <button
                type="button"
                onClick={() => setShowTaskModal(false)}
                style={{ color: "var(--text-muted)" }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateTask}>
              <div className="field">
                <label>Task Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Configure triage workflow"
                  value={newTask.title}
                  onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                />
              </div>

              <div className="field">
                <label>Description</label>
                <textarea
                  rows={3}
                  placeholder="Key instructions or checklist..."
                  value={newTask.description}
                  onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                />
              </div>

              <div className="form-two">
                <div className="field">
                  <label>Status</label>
                  <select
                    value={newTask.status}
                    onChange={(e) => setNewTask({ ...newTask, status: e.target.value })}
                  >
                    <option value="TODO">To Do</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="IN_REVIEW">In Review</option>
                    <option value="DONE">Completed</option>
                  </select>
                </div>

                <div className="field">
                  <label>Priority</label>
                  <select
                    value={newTask.priority}
                    onChange={(e) => setNewTask({ ...newTask, priority: e.target.value })}
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent</option>
                  </select>
                </div>
              </div>

              <div className="form-two" style={{ marginBottom: "22px" }}>
                <div className="field">
                  <label>Assign To</label>
                  <select
                    value={newTask.assignedTo}
                    onChange={(e) => setNewTask({ ...newTask, assignedTo: e.target.value })}
                  >
                    <option value="">Unassigned</option>
                    {(project.members || []).map((m) => (
                      <option key={m.user?._id} value={m.user?._id}>
                        {m.user?.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="field">
                  <label>Deadline</label>
                  <input
                    type="date"
                    value={newTask.deadline}
                    onChange={(e) => setNewTask({ ...newTask, deadline: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                <button
                  type="button"
                  className="button secondary"
                  onClick={() => setShowTaskModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="button primary"
                  disabled={taskSubmitting}
                >
                  {taskSubmitting ? "Creating..." : "Create Task"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Attach File Modal */}
      {showAttachModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(23, 35, 31, 0.45)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1100,
            padding: "16px",
          }}
        >
          <div
            className="panel"
            style={{
              maxWidth: "460px",
              width: "100%",
              padding: "24px",
              boxShadow: "var(--shadow-modal)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <h3 style={{ fontSize: "17px", fontWeight: "750", margin: 0 }}>Attach File or Link</h3>
              <button
                type="button"
                onClick={() => setShowAttachModal(false)}
                style={{ color: "var(--text-muted)" }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddAttachment}>
              <div className="field">
                <label>File / Document Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., protocol_spec.pdf"
                  value={attachmentName}
                  onChange={(e) => setAttachmentName(e.target.value)}
                />
              </div>

              <div className="field" style={{ marginBottom: "20px" }}>
                <label>Upload File or Paste URL *</label>
                <input
                  type="file"
                  onChange={handleLocalFileSelect}
                  style={{ marginBottom: "8px" }}
                />
                <input
                  type="text"
                  placeholder="Or paste external link: https://..."
                  value={attachmentUrl}
                  onChange={(e) => setAttachmentUrl(e.target.value)}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                <button
                  type="button"
                  className="button secondary"
                  onClick={() => setShowAttachModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="button primary"
                  disabled={uploadingAttachment || !attachmentName || !attachmentUrl}
                >
                  {uploadingAttachment ? "Attaching..." : "Attach File"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Invite Member Modal */}
      {showMemberModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(23, 35, 31, 0.45)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1100,
            padding: "16px",
          }}
        >
          <div
            className="panel"
            style={{
              maxWidth: "460px",
              width: "100%",
              padding: "24px",
              boxShadow: "var(--shadow-modal)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <h3 style={{ fontSize: "17px", fontWeight: "750", margin: 0 }}>Invite Team Member</h3>
              <button
                type="button"
                onClick={() => setShowMemberModal(false)}
                style={{ color: "var(--text-muted)" }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddMember}>
              <div className="field">
                <label>Select Collaborator or Enter Email *</label>
                <select
                  value={selectedUserEmail}
                  onChange={(e) => setSelectedUserEmail(e.target.value)}
                  style={{ marginBottom: "8px" }}
                >
                  <option value="">-- Choose from available users --</option>
                  {collaborators
                    .filter((c) => !(project.members || []).some((m) => m.user?._id === c._id))
                    .map((c) => (
                      <option key={c._id} value={c.email}>
                        {c.name} ({c.email}) - {c.role}
                      </option>
                    ))}
                </select>
                <input
                  type="email"
                  placeholder="Or type user email directly..."
                  value={selectedUserEmail}
                  onChange={(e) => setSelectedUserEmail(e.target.value)}
                />
              </div>

              <div className="field" style={{ marginBottom: "22px" }}>
                <label>Project Role</label>
                <select
                  value={memberRole}
                  onChange={(e) => setMemberRole(e.target.value)}
                >
                  <option value="MEMBER">Member (Full task & comment access)</option>
                  <option value="ADMIN">Admin (Manage tasks, members & settings)</option>
                  <option value="VIEWER">Viewer (Read only)</option>
                </select>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                <button
                  type="button"
                  className="button secondary"
                  onClick={() => setShowMemberModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="button primary"
                  disabled={addingMember || !selectedUserEmail.trim()}
                >
                  {addingMember ? "Adding..." : "Add to Project"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
