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
  { id: "TODO", title: "To Do", color: "#6b7280", bg: "#f3f4f6" },
  { id: "IN_PROGRESS", title: "In Progress", color: "#3b82f6", bg: "#eff6ff" },
  { id: "IN_REVIEW", title: "In Review", color: "#f59e0b", bg: "#fffbeb" },
  { id: "DONE", title: "Completed", color: "#10b981", bg: "#ecfdf5" },
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
              // If user was actively editing, detect concurrency
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
      // Optimistic Concurrency check
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
        expectedVersion: taskEditForm.version, // Safe simultaneous update check
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

  // Open Task Modal
  const openTaskDrawer = (task) => {
    setActiveTask(task);
    setTaskEditForm({ ...task });
    setConcurrencyConflict("");
  };

  // Create Task Handler
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

  // Add Comment Handler
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

  // Add Attachment Handler
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

  // Handle Local File Selection
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

  // Delete Attachment Handler
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

  // Delete Task Handler
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

  // Add Project Member Handler
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

  // Tasks grouped by column status
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
      <div style={{ padding: "60px 20px", textAlign: "center", color: "#6b7280" }}>
        <div className="spinner" style={{ margin: "0 auto 12px" }}></div>
        <p>Loading project workspace...</p>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div style={{ padding: "30px", maxWidth: "800px", margin: "0 auto" }}>
        <div
          style={{
            background: "#fef2f2",
            color: "#dc2626",
            padding: "20px",
            borderRadius: "10px",
            border: "1px solid #fee2e2",
          }}
        >
          <h3>Unable to load project</h3>
          <p>{error || "Project not found or you don't have access."}</p>
          <Link to="/workspace" className="primary-button" style={{ marginTop: "12px", display: "inline-block" }}>
            Return to Workspace
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="project-board-view" style={{ padding: "20px 24px", maxWidth: "1600px", margin: "0 auto" }}>
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
            color: "#059669",
            fontWeight: "600",
            fontSize: "14px",
            textDecoration: "none",
          }}
        >
          <ArrowLeft size={16} />
          Back to Projects
        </Link>

        {/* Real-time sync badge */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            background: livePulse ? "#d1fae5" : "#f3f4f6",
            color: livePulse ? "#065f46" : "#4b5563",
            padding: "4px 10px",
            borderRadius: "999px",
            fontSize: "12px",
            fontWeight: "600",
            transition: "all 0.3s ease",
          }}
        >
          <div
            style={{
              width: "8px",
              height: "8px",
              borderRadius: "50%",
              background: livePulse ? "#10b981" : "#059669",
              boxShadow: livePulse ? "0 0 8px #10b981" : "none",
            }}
          />
          <span>{livePulse ? "Realtime Sync Active" : "Collaborative Board (Live)"}</span>
        </div>
      </div>

      {/* Project Header Card */}
      <div
        style={{
          background: "#fff",
          borderRadius: "14px",
          border: "1px solid #e5e7eb",
          padding: "20px 24px",
          marginBottom: "24px",
          boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            flexWrap: "wrap",
            gap: "16px",
          }}
        >
          <div style={{ flex: "1 1 500px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px", flexWrap: "wrap" }}>
              <span
                style={{
                  fontSize: "11px",
                  fontWeight: "700",
                  textTransform: "uppercase",
                  padding: "3px 8px",
                  borderRadius: "6px",
                  background: "#f3f4f6",
                  color: "#4b5563",
                }}
              >
                {project.category || "General"}
              </span>
              <span
                style={{
                  fontSize: "11px",
                  fontWeight: "600",
                  padding: "3px 8px",
                  borderRadius: "6px",
                  background:
                    project.priority === "URGENT"
                      ? "#fee2e2"
                      : project.priority === "HIGH"
                      ? "#fef3c7"
                      : "#e0f2fe",
                  color:
                    project.priority === "URGENT"
                      ? "#b91c1c"
                      : project.priority === "HIGH"
                      ? "#b45309"
                      : "#0369a1",
                }}
              >
                {project.priority} Priority
              </span>
              <span
                style={{
                  fontSize: "11px",
                  fontWeight: "600",
                  padding: "3px 8px",
                  borderRadius: "6px",
                  background: project.status === "COMPLETED" ? "#d1fae5" : "#dbeafe",
                  color: project.status === "COMPLETED" ? "#065f46" : "#1e40af",
                }}
              >
                {project.status}
              </span>
            </div>

            <h1 style={{ fontSize: "24px", fontWeight: "700", margin: "0 0 6px", color: "#111827" }}>
              {project.name}
            </h1>
            <p style={{ color: "#6b7280", fontSize: "14px", margin: 0, lineHeight: 1.5 }}>
              {project.description || "Collaborative workspace for project execution and tracking."}
            </p>
          </div>

          {/* Action Buttons & Members */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "12px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
              <button
                className="primary-button"
                onClick={() => setShowTaskModal(true)}
                style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "8px 16px" }}
              >
                <Plus size={16} />
                Add Task
              </button>
              <button
                className="secondary-button"
                onClick={() => setShowMemberModal(true)}
                style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "8px 14px" }}
              >
                <Users size={16} />
                Invite Member
              </button>
            </div>

            {/* Members Avatars Row */}
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "12px", color: "#6b7280", fontWeight: "500" }}>Team:</span>
              <div style={{ display: "flex" }}>
                {(project.members || []).map((m, idx) => (
                  <div
                    key={m.user?._id || idx}
                    title={`${m.user?.name || "Member"} (${m.role})`}
                    style={{
                      width: "28px",
                      height: "28px",
                      borderRadius: "50%",
                      background: "#10b981",
                      color: "#fff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "11px",
                      fontWeight: "700",
                      border: "2px solid #fff",
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
            paddingTop: "16px",
            borderTop: "1px solid #f3f4f6",
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
                fontWeight: "600",
                color: "#4b5563",
                marginBottom: "6px",
              }}
            >
              <span>Project Progress</span>
              <span>{project.progress || 0}%</span>
            </div>
            <div
              style={{
                width: "100%",
                height: "8px",
                background: "#e5e7eb",
                borderRadius: "999px",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: `${project.progress || 0}%`,
                  height: "100%",
                  background:
                    project.progress === 100
                      ? "#10b981"
                      : "linear-gradient(90deg, #10b981 0%, #3b82f6 100%)",
                  borderRadius: "999px",
                  transition: "width 0.4s ease",
                }}
              />
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#4b5563", fontSize: "13px" }}>
            <Calendar size={16} style={{ color: "#059669" }} />
            <span>
              Target Deadline:{" "}
              <strong>
                {project.deadline ? new Date(project.deadline).toLocaleDateString() : "No date set"}
              </strong>
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#4b5563", fontSize: "13px" }}>
            <CheckSquare size={16} style={{ color: "#3b82f6" }} />
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
              style={{
                padding: "6px 10px",
                borderRadius: "6px",
                border: "1px solid #d1d5db",
                background: viewMode === "board" ? "#10b981" : "#fff",
                color: viewMode === "board" ? "#fff" : "#4b5563",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                fontSize: "12px",
                fontWeight: "600",
              }}
            >
              <LayoutGrid size={14} />
              Board
            </button>
            <button
              onClick={() => setViewMode("list")}
              style={{
                padding: "6px 10px",
                borderRadius: "6px",
                border: "1px solid #d1d5db",
                background: viewMode === "list" ? "#10b981" : "#fff",
                color: viewMode === "list" ? "#fff" : "#4b5563",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                fontSize: "12px",
                fontWeight: "600",
              }}
            >
              <ListIcon size={14} />
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
                  background: "#f9fafb",
                  borderRadius: "12px",
                  border: "1px solid #e5e7eb",
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
                    borderBottom: "2px solid #e5e7eb",
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
                    <h3 style={{ fontSize: "15px", fontWeight: "700", margin: 0, color: "#111827" }}>
                      {col.title}
                    </h3>
                  </div>
                  <span
                    style={{
                      background: "#e5e7eb",
                      color: "#374151",
                      padding: "2px 8px",
                      borderRadius: "999px",
                      fontSize: "12px",
                      fontWeight: "700",
                    }}
                  >
                    {colTasks.length}
                  </span>
                </div>

                {/* Task Cards in Column */}
                <div style={{ display: "flex", flexDirection: "column", gap: "12px", flexGrow: 1 }}>
                  {colTasks.map((task) => (
                    <div
                      key={task._id}
                      onClick={() => openTaskDrawer(task)}
                      style={{
                        background: "#fff",
                        borderRadius: "10px",
                        border: "1px solid #e5e7eb",
                        padding: "14px",
                        boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
                        cursor: "pointer",
                        transition: "all 0.15s ease",
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
                          style={{
                            fontSize: "10px",
                            fontWeight: "700",
                            textTransform: "uppercase",
                            padding: "2px 6px",
                            borderRadius: "4px",
                            background:
                              task.priority === "URGENT"
                                ? "#fee2e2"
                                : task.priority === "HIGH"
                                ? "#fef3c7"
                                : "#e0f2fe",
                            color:
                              task.priority === "URGENT"
                                ? "#b91c1c"
                                : task.priority === "HIGH"
                                ? "#b45309"
                                : "#0369a1",
                          }}
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
                                color: "#9ca3af",
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
                                color: "#059669",
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
                          fontWeight: "600",
                          color: "#111827",
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
                            color: "#6b7280",
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
                              background: "#e5e7eb",
                              borderRadius: "2px",
                              overflow: "hidden",
                            }}
                          >
                            <div
                              style={{
                                width: `${task.progress}%`,
                                height: "100%",
                                background: "#3b82f6",
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
                          color: "#6b7280",
                          paddingTop: "8px",
                          borderTop: "1px solid #f3f4f6",
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
                                background: "#3b82f6",
                                color: "#fff",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: "10px",
                                fontWeight: "700",
                              }}
                            >
                              {task.assignedTo.name.charAt(0).toUpperCase()}
                            </div>
                          ) : (
                            <span style={{ color: "#9ca3af" }}>Unassigned</span>
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
                        border: "1px dashed #d1d5db",
                        borderRadius: "8px",
                        padding: "24px 12px",
                        textAlign: "center",
                        color: "#9ca3af",
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
        <div style={{ background: "#fff", borderRadius: "12px", border: "1px solid #e5e7eb", overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "13px" }}>
            <thead>
              <tr style={{ background: "#f9fafb", borderBottom: "1px solid #e5e7eb", color: "#4b5563" }}>
                <th style={{ padding: "12px 16px" }}>Task Title</th>
                <th style={{ padding: "12px 16px" }}>Status</th>
                <th style={{ padding: "12px 16px" }}>Priority</th>
                <th style={{ padding: "12px 16px" }}>Assignee</th>
                <th style={{ padding: "12px 16px" }}>Deadline</th>
                <th style={{ padding: "12px 16px" }}>Progress</th>
                <th style={{ padding: "12px 16px" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map((task) => (
                <tr
                  key={task._id}
                  style={{ borderBottom: "1px solid #f3f4f6", cursor: "pointer" }}
                  onClick={() => openTaskDrawer(task)}
                >
                  <td style={{ padding: "14px 16px", fontWeight: "600", color: "#111827" }}>{task.title}</td>
                  <td style={{ padding: "14px 16px" }}>
                    <span
                      style={{
                        fontSize: "11px",
                        fontWeight: "600",
                        padding: "3px 8px",
                        borderRadius: "6px",
                        background:
                          task.status === "DONE"
                            ? "#d1fae5"
                            : task.status === "IN_PROGRESS"
                            ? "#dbeafe"
                            : task.status === "IN_REVIEW"
                            ? "#fef3c7"
                            : "#f3f4f6",
                        color:
                          task.status === "DONE"
                            ? "#065f46"
                            : task.status === "IN_PROGRESS"
                            ? "#1e40af"
                            : task.status === "IN_REVIEW"
                            ? "#b45309"
                            : "#374151",
                      }}
                    >
                      {task.status}
                    </span>
                  </td>
                  <td style={{ padding: "14px 16px" }}>
                    <span
                      style={{
                        fontSize: "11px",
                        fontWeight: "600",
                        padding: "3px 8px",
                        borderRadius: "6px",
                        background:
                          task.priority === "URGENT"
                            ? "#fee2e2"
                            : task.priority === "HIGH"
                            ? "#fef3c7"
                            : "#e0f2fe",
                        color:
                          task.priority === "URGENT"
                            ? "#b91c1c"
                            : task.priority === "HIGH"
                            ? "#b45309"
                            : "#0369a1",
                      }}
                    >
                      {task.priority}
                    </span>
                  </td>
                  <td style={{ padding: "14px 16px", color: "#4b5563" }}>
                    {task.assignedTo?.name || "Unassigned"}
                  </td>
                  <td style={{ padding: "14px 16px", color: "#4b5563" }}>
                    {task.deadline ? new Date(task.deadline).toLocaleDateString() : "-"}
                  </td>
                  <td style={{ padding: "14px 16px" }}>{task.progress || 0}%</td>
                  <td style={{ padding: "14px 16px" }}>
                    <button
                      className="secondary-button"
                      style={{ padding: "4px 10px", fontSize: "12px" }}
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
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            justifyContent: "flex-end",
            zIndex: 1000,
          }}
          onClick={() => setActiveTask(null)}
        >
          <div
            style={{
              background: "#fff",
              width: "100%",
              maxWidth: "680px",
              height: "100%",
              boxShadow: "-10px 0 25px rgba(0,0,0,0.1)",
              display: "flex",
              flexDirection: "column",
              overflowY: "auto",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer Header */}
            <div
              style={{
                padding: "20px 24px",
                borderBottom: "1px solid #e5e7eb",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                position: "sticky",
                top: 0,
                background: "#fff",
                zIndex: 10,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span
                  style={{
                    fontSize: "11px",
                    fontWeight: "700",
                    padding: "3px 8px",
                    borderRadius: "4px",
                    background: "#f3f4f6",
                    color: "#4b5563",
                  }}
                >
                  Version {taskEditForm.version || 1}
                </span>
                <h3 style={{ fontSize: "18px", fontWeight: "700", margin: 0, color: "#111827" }}>
                  Task Details & Collaboration
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setActiveTask(null)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "#6b7280" }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Concurrency Conflict Banner */}
            {concurrencyConflict && (
              <div
                style={{
                  margin: "16px 24px 0",
                  padding: "12px 16px",
                  background: "#fffbeb",
                  border: "1px solid #fde68a",
                  borderRadius: "8px",
                  color: "#92400e",
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "10px",
                  fontSize: "13px",
                  lineHeight: 1.4,
                }}
              >
                <AlertTriangle size={18} style={{ flexShrink: 0, marginTop: "2px" }} />
                <div>
                  <strong>Safe Concurrency Alert</strong>
                  <p style={{ margin: "4px 0 0" }}>{concurrencyConflict}</p>
                </div>
              </div>
            )}

            {/* Drawer Content Body */}
            <div style={{ padding: "24px", flexGrow: 1 }}>
              {/* Task Edit Form */}
              <form onSubmit={handleSaveTaskEdit} style={{ marginBottom: "28px" }}>
                <div style={{ marginBottom: "14px" }}>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: "600", marginBottom: "6px", color: "#374151" }}>
                    Task Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={taskEditForm.title}
                    onChange={(e) => setTaskEditForm({ ...taskEditForm, title: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "9px 12px",
                      borderRadius: "8px",
                      border: "1px solid #d1d5db",
                      fontSize: "14px",
                      boxSizing: "border-box",
                    }}
                  />
                </div>

                <div style={{ marginBottom: "14px" }}>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: "600", marginBottom: "6px", color: "#374151" }}>
                    Description
                  </label>
                  <textarea
                    rows={3}
                    value={taskEditForm.description}
                    onChange={(e) => setTaskEditForm({ ...taskEditForm, description: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "9px 12px",
                      borderRadius: "8px",
                      border: "1px solid #d1d5db",
                      fontSize: "14px",
                      boxSizing: "border-box",
                      resize: "vertical",
                    }}
                  />
                </div>

                {/* Status, Priority, Assignee Grid */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "14px" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "13px", fontWeight: "600", marginBottom: "6px", color: "#374151" }}>
                      Status
                    </label>
                    <select
                      value={taskEditForm.status}
                      onChange={(e) => setTaskEditForm({ ...taskEditForm, status: e.target.value })}
                      style={{
                        width: "100%",
                        padding: "9px 12px",
                        borderRadius: "8px",
                        border: "1px solid #d1d5db",
                        fontSize: "14px",
                        boxSizing: "border-box",
                        background: "#fff",
                      }}
                    >
                      <option value="TODO">To Do</option>
                      <option value="IN_PROGRESS">In Progress</option>
                      <option value="IN_REVIEW">In Review</option>
                      <option value="DONE">Completed</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "13px", fontWeight: "600", marginBottom: "6px", color: "#374151" }}>
                      Priority
                    </label>
                    <select
                      value={taskEditForm.priority}
                      onChange={(e) => setTaskEditForm({ ...taskEditForm, priority: e.target.value })}
                      style={{
                        width: "100%",
                        padding: "9px 12px",
                        borderRadius: "8px",
                        border: "1px solid #d1d5db",
                        fontSize: "14px",
                        boxSizing: "border-box",
                        background: "#fff",
                      }}
                    >
                      <option value="LOW">Low</option>
                      <option value="MEDIUM">Medium</option>
                      <option value="HIGH">High</option>
                      <option value="URGENT">Urgent</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "14px" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "13px", fontWeight: "600", marginBottom: "6px", color: "#374151" }}>
                      Assignee
                    </label>
                    <select
                      value={taskEditForm.assignedTo?._id || taskEditForm.assignedTo || ""}
                      onChange={(e) => setTaskEditForm({ ...taskEditForm, assignedTo: e.target.value })}
                      style={{
                        width: "100%",
                        padding: "9px 12px",
                        borderRadius: "8px",
                        border: "1px solid #d1d5db",
                        fontSize: "14px",
                        boxSizing: "border-box",
                        background: "#fff",
                      }}
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

                  <div>
                    <label style={{ display: "block", fontSize: "13px", fontWeight: "600", marginBottom: "6px", color: "#374151" }}>
                      Deadline
                    </label>
                    <input
                      type="date"
                      value={taskEditForm.deadline ? taskEditForm.deadline.substring(0, 10) : ""}
                      onChange={(e) => setTaskEditForm({ ...taskEditForm, deadline: e.target.value })}
                      style={{
                        width: "100%",
                        padding: "9px 12px",
                        borderRadius: "8px",
                        border: "1px solid #d1d5db",
                        fontSize: "14px",
                        boxSizing: "border-box",
                      }}
                    />
                  </div>
                </div>

                {/* Progress Slider */}
                <div style={{ marginBottom: "18px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", fontWeight: "600", marginBottom: "6px" }}>
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
                    style={{ width: "100%", accentColor: "#10b981", cursor: "pointer" }}
                  />
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <button
                    type="button"
                    onClick={() => handleDeleteTask(taskEditForm._id)}
                    style={{
                      background: "none",
                      border: "none",
                      color: "#dc2626",
                      fontSize: "13px",
                      fontWeight: "600",
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px",
                    }}
                  >
                    <Trash2 size={16} />
                    Delete Task
                  </button>

                  <button
                    type="submit"
                    className="primary-button"
                    disabled={savingTask}
                    style={{ padding: "8px 20px" }}
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
                  borderTop: "1px solid #e5e7eb",
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
                  <h4 style={{ fontSize: "15px", fontWeight: "700", margin: 0, color: "#111827", display: "flex", alignItems: "center", gap: "6px" }}>
                    <Paperclip size={16} />
                    Files & Attachments ({(activeTask.attachments || []).length})
                  </h4>
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => setShowAttachModal(true)}
                    style={{ padding: "4px 10px", fontSize: "12px" }}
                  >
                    + Add File
                  </button>
                </div>

                {(activeTask.attachments || []).length === 0 ? (
                  <p style={{ fontSize: "13px", color: "#9ca3af", fontStyle: "italic", margin: 0 }}>
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
                          padding: "8px 12px",
                          borderRadius: "6px",
                          border: "1px solid #e5e7eb",
                          background: "#f9fafb",
                          fontSize: "13px",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <FileText size={16} style={{ color: "#3b82f6" }} />
                          <a
                            href={att.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            download={att.name}
                            style={{ fontWeight: "600", color: "#1e40af", textDecoration: "underline" }}
                          >
                            {att.name}
                          </a>
                          <span style={{ fontSize: "11px", color: "#9ca3af" }}>
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
                            color: "#9ca3af",
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
                  borderTop: "1px solid #e5e7eb",
                }}
              >
                <h4
                  style={{
                    fontSize: "15px",
                    fontWeight: "700",
                    margin: "0 0 14px",
                    color: "#111827",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  <MessageSquare size={16} />
                  Comments & Activity ({(activeTask.comments || []).length})
                </h4>

                {/* Comments List */}
                <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "16px" }}>
                  {(activeTask.comments || []).map((c, idx) => (
                    <div
                      key={c._id || idx}
                      style={{
                        padding: "10px 14px",
                        borderRadius: "8px",
                        background: "#f9fafb",
                        border: "1px solid #f3f4f6",
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
                        <strong style={{ color: "#111827" }}>{c.user?.name || "Team Member"}</strong>
                        <span style={{ color: "#9ca3af" }}>
                          {new Date(c.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                      <p style={{ margin: 0, fontSize: "13px", color: "#374151", lineHeight: 1.4 }}>
                        {c.text}
                      </p>
                    </div>
                  ))}

                  {(activeTask.comments || []).length === 0 && (
                    <p style={{ fontSize: "13px", color: "#9ca3af", fontStyle: "italic", margin: 0 }}>
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
                      padding: "8px 12px",
                      borderRadius: "8px",
                      border: "1px solid #d1d5db",
                      fontSize: "13px",
                    }}
                  />
                  <button
                    type="submit"
                    className="primary-button"
                    disabled={submittingComment || !commentText.trim()}
                    style={{ padding: "8px 14px", display: "inline-flex", alignItems: "center", gap: "4px" }}
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
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "16px",
          }}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: "14px",
              maxWidth: "500px",
              width: "100%",
              padding: "24px",
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "16px",
              }}
            >
              <h2 style={{ fontSize: "18px", fontWeight: "700", margin: 0, color: "#111827" }}>
                Add New Task
              </h2>
              <button
                type="button"
                onClick={() => setShowTaskModal(false)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "#6b7280" }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateTask}>
              <div style={{ marginBottom: "14px" }}>
                <label style={{ display: "block", fontSize: "13px", fontWeight: "600", marginBottom: "6px" }}>
                  Task Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Configure triage workflow"
                  value={newTask.title}
                  onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                  style={{
                    width: "100%",
                    padding: "9px 12px",
                    borderRadius: "8px",
                    border: "1px solid #d1d5db",
                    fontSize: "14px",
                    boxSizing: "border-box",
                  }}
                />
              </div>

              <div style={{ marginBottom: "14px" }}>
                <label style={{ display: "block", fontSize: "13px", fontWeight: "600", marginBottom: "6px" }}>
                  Description
                </label>
                <textarea
                  rows={3}
                  placeholder="Key instructions or checklist..."
                  value={newTask.description}
                  onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                  style={{
                    width: "100%",
                    padding: "9px 12px",
                    borderRadius: "8px",
                    border: "1px solid #d1d5db",
                    fontSize: "14px",
                    boxSizing: "border-box",
                  }}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "14px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: "600", marginBottom: "6px" }}>
                    Status
                  </label>
                  <select
                    value={newTask.status}
                    onChange={(e) => setNewTask({ ...newTask, status: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "9px 12px",
                      borderRadius: "8px",
                      border: "1px solid #d1d5db",
                      fontSize: "14px",
                      boxSizing: "border-box",
                      background: "#fff",
                    }}
                  >
                    <option value="TODO">To Do</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="IN_REVIEW">In Review</option>
                    <option value="DONE">Completed</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: "600", marginBottom: "6px" }}>
                    Priority
                  </label>
                  <select
                    value={newTask.priority}
                    onChange={(e) => setNewTask({ ...newTask, priority: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "9px 12px",
                      borderRadius: "8px",
                      border: "1px solid #d1d5db",
                      fontSize: "14px",
                      boxSizing: "border-box",
                      background: "#fff",
                    }}
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent</option>
                  </select>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "20px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: "600", marginBottom: "6px" }}>
                    Assign To
                  </label>
                  <select
                    value={newTask.assignedTo}
                    onChange={(e) => setNewTask({ ...newTask, assignedTo: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "9px 12px",
                      borderRadius: "8px",
                      border: "1px solid #d1d5db",
                      fontSize: "14px",
                      boxSizing: "border-box",
                      background: "#fff",
                    }}
                  >
                    <option value="">Unassigned</option>
                    {(project.members || []).map((m) => (
                      <option key={m.user?._id} value={m.user?._id}>
                        {m.user?.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: "600", marginBottom: "6px" }}>
                    Deadline
                  </label>
                  <input
                    type="date"
                    value={newTask.deadline}
                    onChange={(e) => setNewTask({ ...newTask, deadline: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "9px 12px",
                      borderRadius: "8px",
                      border: "1px solid #d1d5db",
                      fontSize: "14px",
                      boxSizing: "border-box",
                    }}
                  />
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => setShowTaskModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="primary-button"
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
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1100,
            padding: "16px",
          }}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: "14px",
              maxWidth: "460px",
              width: "100%",
              padding: "24px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <h3 style={{ fontSize: "17px", fontWeight: "700", margin: 0 }}>Attach File or Link</h3>
              <button
                type="button"
                onClick={() => setShowAttachModal(false)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "#6b7280" }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddAttachment}>
              <div style={{ marginBottom: "14px" }}>
                <label style={{ display: "block", fontSize: "13px", fontWeight: "600", marginBottom: "6px" }}>
                  File / Document Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g., protocol_spec.pdf"
                  value={attachmentName}
                  onChange={(e) => setAttachmentName(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    borderRadius: "8px",
                    border: "1px solid #d1d5db",
                    fontSize: "13px",
                    boxSizing: "border-box",
                  }}
                />
              </div>

              <div style={{ marginBottom: "14px" }}>
                <label style={{ display: "block", fontSize: "13px", fontWeight: "600", marginBottom: "6px" }}>
                  Upload File or Paste URL *
                </label>
                <input
                  type="file"
                  onChange={handleLocalFileSelect}
                  style={{ display: "block", marginBottom: "8px", fontSize: "13px" }}
                />
                <input
                  type="text"
                  placeholder="Or paste external link: https://..."
                  value={attachmentUrl}
                  onChange={(e) => setAttachmentUrl(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    borderRadius: "8px",
                    border: "1px solid #d1d5db",
                    fontSize: "13px",
                    boxSizing: "border-box",
                  }}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => setShowAttachModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="primary-button"
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
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1100,
            padding: "16px",
          }}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: "14px",
              maxWidth: "460px",
              width: "100%",
              padding: "24px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <h3 style={{ fontSize: "17px", fontWeight: "700", margin: 0 }}>Invite Team Member</h3>
              <button
                type="button"
                onClick={() => setShowMemberModal(false)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "#6b7280" }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddMember}>
              <div style={{ marginBottom: "14px" }}>
                <label style={{ display: "block", fontSize: "13px", fontWeight: "600", marginBottom: "6px" }}>
                  Select Collaborator or Enter Email *
                </label>
                <select
                  value={selectedUserEmail}
                  onChange={(e) => setSelectedUserEmail(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    borderRadius: "8px",
                    border: "1px solid #d1d5db",
                    fontSize: "13px",
                    boxSizing: "border-box",
                    background: "#fff",
                    marginBottom: "8px",
                  }}
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
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    borderRadius: "8px",
                    border: "1px solid #d1d5db",
                    fontSize: "13px",
                    boxSizing: "border-box",
                  }}
                />
              </div>

              <div style={{ marginBottom: "20px" }}>
                <label style={{ display: "block", fontSize: "13px", fontWeight: "600", marginBottom: "6px" }}>
                  Project Role
                </label>
                <select
                  value={memberRole}
                  onChange={(e) => setMemberRole(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    borderRadius: "8px",
                    border: "1px solid #d1d5db",
                    fontSize: "13px",
                    boxSizing: "border-box",
                    background: "#fff",
                  }}
                >
                  <option value="MEMBER">Member (Full task & comment access)</option>
                  <option value="ADMIN">Admin (Manage tasks, members & settings)</option>
                  <option value="VIEWER">Viewer (Read only)</option>
                </select>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => setShowMemberModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="primary-button"
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
