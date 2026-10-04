import { useEffect, useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  FolderKanban,
  Plus,
  Search,
  Calendar,
  CheckCircle2,
  Clock,
  Users,
  AlertCircle,
  TrendingUp,
  ListTodo,
  CheckSquare,
  ArrowRight,
  Filter,
  Layers,
  X,
  Sparkles,
} from "lucide-react";
import {
  getProjects,
  getProjectDashboard,
  createProject,
} from "../services/projectApi";
import { useAuth } from "../context/AuthContext";

export default function Workspace() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [dashboard, setDashboard] = useState(null);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("all"); // all, active, completed, mytasks
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [priorityFilter, setPriorityFilter] = useState("ALL");

  // Create Project Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newProject, setNewProject] = useState({
    name: "",
    description: "",
    priority: "MEDIUM",
    category: "Operations",
    deadline: "",
  });
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  const fetchData = async () => {
    try {
      setLoading(true);
      setError("");
      const [dashRes, projRes] = await Promise.all([
        getProjectDashboard(),
        getProjects(),
      ]);
      setDashboard(dashRes.data || {});
      setProjects(projRes.data || []);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load workspace data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateProject = async (e) => {
    e.preventDefault();
    if (!newProject.name.trim()) {
      setCreateError("Project name is required.");
      return;
    }

    try {
      setCreating(true);
      setCreateError("");
      const res = await createProject(newProject);
      setShowCreateModal(false);
      setNewProject({
        name: "",
        description: "",
        priority: "MEDIUM",
        category: "Operations",
        deadline: "",
      });
      fetchData();
      if (res.data?._id) {
        navigate(`/workspace/projects/${res.data._id}`);
      }
    } catch (err) {
      setCreateError(err?.response?.data?.message || "Failed to create project.");
    } finally {
      setCreating(false);
    }
  };

  const categories = useMemo(() => {
    const set = new Set(projects.map((p) => p.category || "General"));
    return ["ALL", ...Array.from(set)];
  }, [projects]);

  const filteredProjects = useMemo(() => {
    return projects.filter((project) => {
      // Tab filter
      if (activeTab === "active" && project.status === "COMPLETED") return false;
      if (activeTab === "completed" && project.status !== "COMPLETED") return false;

      // Category filter
      if (categoryFilter !== "ALL" && (project.category || "General") !== categoryFilter) {
        return false;
      }

      // Priority filter
      if (priorityFilter !== "ALL" && project.priority !== priorityFilter) {
        return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchName = project.name?.toLowerCase().includes(query);
        const matchDesc = project.description?.toLowerCase().includes(query);
        const matchCat = project.category?.toLowerCase().includes(query);
        if (!matchName && !matchDesc && !matchCat) return false;
      }

      return true;
    });
  }, [projects, activeTab, categoryFilter, priorityFilter, searchQuery]);

  const getPriorityBadgeClass = (priority) => {
    switch (priority) {
      case "URGENT":
        return "badge-danger";
      case "HIGH":
        return "badge-warning";
      case "MEDIUM":
        return "badge-info";
      default:
        return "badge-secondary";
    }
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case "COMPLETED":
        return "badge-success";
      case "IN_PROGRESS":
        return "badge-primary";
      case "ON_HOLD":
        return "badge-warning";
      default:
        return "badge-secondary";
    }
  };

  const formatDeadline = (deadlineDate) => {
    if (!deadlineDate) return null;
    const date = new Date(deadlineDate);
    const now = new Date();
    const diffTime = date.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return { text: `Overdue by ${Math.abs(diffDays)}d`, isOverdue: true };
    } else if (diffDays === 0) {
      return { text: "Due today", isDueSoon: true };
    } else if (diffDays === 1) {
      return { text: "Due tomorrow", isDueSoon: true };
    } else {
      return { text: `${diffDays} days left`, isNormal: true };
    }
  };

  const summary = dashboard?.summary || {};
  const tasksByStatus = dashboard?.tasksByStatus || {};
  const upcomingTasks = dashboard?.upcomingTasks || [];
  const myAssignedTasks = dashboard?.myAssignedTasks || [];

  return (
    <div className="workspace-page" style={{ padding: "24px", maxWidth: "1400px", margin: "0 auto" }}>
      {/* Page Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          flexWrap: "wrap",
          gap: "16px",
          marginBottom: "24px",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
            <div
              style={{
                width: "38px",
                height: "38px",
                borderRadius: "10px",
                background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#fff",
              }}
            >
              <FolderKanban size={22} />
            </div>
            <h1 style={{ fontSize: "26px", fontWeight: "700", margin: 0, color: "#111827" }}>
              Project Workspace
            </h1>
          </div>
          <p style={{ margin: 0, color: "#4b5563", fontSize: "14px" }}>
            Collaborate on initiatives, track tasks, manage deadlines, and sync team progress in real time.
          </p>
        </div>

        <button
          className="primary-button"
          onClick={() => setShowCreateModal(true)}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            padding: "10px 18px",
            fontWeight: "600",
            fontSize: "14px",
          }}
        >
          <Plus size={18} />
          New Project
        </button>
      </div>

      {/* Workspace Metric KPI Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "16px",
          marginBottom: "28px",
        }}
      >
        <div
          className="stat-card"
          style={{
            background: "#fff",
            padding: "18px 20px",
            borderRadius: "12px",
            border: "1px solid #e5e7eb",
            boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "13px", fontWeight: "600", color: "#6b7280" }}>Active Projects</span>
            <span
              style={{
                background: "#ecfdf5",
                color: "#059669",
                padding: "4px 8px",
                borderRadius: "6px",
                fontSize: "12px",
                fontWeight: "600",
              }}
            >
              {summary.totalProjects || 0} Total
            </span>
          </div>
          <div style={{ fontSize: "28px", fontWeight: "700", color: "#111827", marginTop: "8px" }}>
            {summary.activeProjects || 0}
          </div>
          <div style={{ fontSize: "12px", color: "#6b7280", marginTop: "4px" }}>
            {summary.completedProjects || 0} completed
          </div>
        </div>

        <div
          className="stat-card"
          style={{
            background: "#fff",
            padding: "18px 20px",
            borderRadius: "12px",
            border: "1px solid #e5e7eb",
            boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "13px", fontWeight: "600", color: "#6b7280" }}>Tasks In Progress</span>
            <div style={{ color: "#3b82f6" }}><Clock size={18} /></div>
          </div>
          <div style={{ fontSize: "28px", fontWeight: "700", color: "#3b82f6", marginTop: "8px" }}>
            {tasksByStatus.IN_PROGRESS || 0}
          </div>
          <div style={{ fontSize: "12px", color: "#6b7280", marginTop: "4px" }}>
            {tasksByStatus.TODO || 0} To-Do • {tasksByStatus.IN_REVIEW || 0} In Review
          </div>
        </div>

        <div
          className="stat-card"
          style={{
            background: "#fff",
            padding: "18px 20px",
            borderRadius: "12px",
            border: "1px solid #e5e7eb",
            boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "13px", fontWeight: "600", color: "#6b7280" }}>Completion Rate</span>
            <div style={{ color: "#10b981" }}><TrendingUp size={18} /></div>
          </div>
          <div style={{ fontSize: "28px", fontWeight: "700", color: "#10b981", marginTop: "8px" }}>
            {summary.completionRate || 0}%
          </div>
          <div style={{ fontSize: "12px", color: "#6b7280", marginTop: "4px" }}>
            {tasksByStatus.DONE || 0} of {summary.totalTasks || 0} tasks done
          </div>
        </div>

        <div
          className="stat-card"
          style={{
            background: "#fff",
            padding: "18px 20px",
            borderRadius: "12px",
            border: "1px solid #e5e7eb",
            boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "13px", fontWeight: "600", color: "#6b7280" }}>Assigned To Me</span>
            <div style={{ color: "#8b5cf6" }}><ListTodo size={18} /></div>
          </div>
          <div style={{ fontSize: "28px", fontWeight: "700", color: "#8b5cf6", marginTop: "8px" }}>
            {summary.myAssignedCount || 0}
          </div>
          <div style={{ fontSize: "12px", color: "#6b7280", marginTop: "4px" }}>
            Directly assigned action items
          </div>
        </div>
      </div>

      {/* Tabs and Filters */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "14px",
          marginBottom: "20px",
          background: "#fff",
          padding: "12px 16px",
          borderRadius: "12px",
          border: "1px solid #e5e7eb",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
          <button
            onClick={() => setActiveTab("all")}
            style={{
              padding: "8px 14px",
              borderRadius: "8px",
              border: "none",
              fontSize: "13px",
              fontWeight: "600",
              cursor: "pointer",
              background: activeTab === "all" ? "#10b981" : "#f3f4f6",
              color: activeTab === "all" ? "#fff" : "#4b5563",
              transition: "all 0.15s ease",
            }}
          >
            All Projects ({projects.length})
          </button>
          <button
            onClick={() => setActiveTab("active")}
            style={{
              padding: "8px 14px",
              borderRadius: "8px",
              border: "none",
              fontSize: "13px",
              fontWeight: "600",
              cursor: "pointer",
              background: activeTab === "active" ? "#10b981" : "#f3f4f6",
              color: activeTab === "active" ? "#fff" : "#4b5563",
              transition: "all 0.15s ease",
            }}
          >
            Active ({summary.activeProjects || 0})
          </button>
          <button
            onClick={() => setActiveTab("completed")}
            style={{
              padding: "8px 14px",
              borderRadius: "8px",
              border: "none",
              fontSize: "13px",
              fontWeight: "600",
              cursor: "pointer",
              background: activeTab === "completed" ? "#10b981" : "#f3f4f6",
              color: activeTab === "completed" ? "#fff" : "#4b5563",
              transition: "all 0.15s ease",
            }}
          >
            Completed ({summary.completedProjects || 0})
          </button>
          <button
            onClick={() => setActiveTab("mytasks")}
            style={{
              padding: "8px 14px",
              borderRadius: "8px",
              border: "none",
              fontSize: "13px",
              fontWeight: "600",
              cursor: "pointer",
              background: activeTab === "mytasks" ? "#10b981" : "#f3f4f6",
              color: activeTab === "mytasks" ? "#fff" : "#4b5563",
              transition: "all 0.15s ease",
            }}
          >
            My Tasks ({summary.myAssignedCount || 0})
          </button>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap", flexGrow: 1, justifyContent: "flex-end" }}>
          {/* Search Box */}
          <div style={{ position: "relative", minWidth: "220px" }}>
            <Search
              size={16}
              style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "#9ca3af" }}
            />
            <input
              type="text"
              placeholder="Search projects..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: "100%",
                padding: "8px 12px 8px 34px",
                borderRadius: "8px",
                border: "1px solid #d1d5db",
                fontSize: "13px",
                outline: "none",
              }}
            />
          </div>

          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            style={{
              padding: "8px 12px",
              borderRadius: "8px",
              border: "1px solid #d1d5db",
              fontSize: "13px",
              background: "#fff",
              outline: "none",
              cursor: "pointer",
            }}
          >
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                Category: {cat}
              </option>
            ))}
          </select>

          {/* Priority Filter */}
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            style={{
              padding: "8px 12px",
              borderRadius: "8px",
              border: "1px solid #d1d5db",
              fontSize: "13px",
              background: "#fff",
              outline: "none",
              cursor: "pointer",
            }}
          >
            <option value="ALL">Priority: All</option>
            <option value="URGENT">Urgent</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "60px 0", color: "#6b7280" }}>
          <div className="spinner" style={{ margin: "0 auto 12px" }}></div>
          <p>Loading project workspace...</p>
        </div>
      ) : error ? (
        <div
          style={{
            background: "#fef2f2",
            color: "#dc2626",
            padding: "16px 20px",
            borderRadius: "8px",
            border: "1px solid #fee2e2",
            display: "flex",
            alignItems: "center",
            gap: "10px",
            marginBottom: "20px",
          }}
        >
          <AlertCircle size={20} />
          <span>{error}</span>
        </div>
      ) : activeTab === "mytasks" ? (
        /* My Assigned Tasks Tab View */
        <div style={{ background: "#fff", borderRadius: "12px", border: "1px solid #e5e7eb", padding: "20px" }}>
          <h2 style={{ fontSize: "18px", fontWeight: "700", marginBottom: "16px", color: "#111827" }}>
            My Assigned Tasks ({myAssignedTasks.length})
          </h2>
          {myAssignedTasks.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 0", color: "#6b7280" }}>
              <CheckSquare size={40} style={{ margin: "0 auto 10px", color: "#9ca3af" }} />
              <p style={{ margin: 0, fontWeight: "500" }}>You have no tasks assigned right now.</p>
              <p style={{ fontSize: "13px", color: "#9ca3af" }}>Pick tasks from any project workspace board!</p>
            </div>
          ) : (
            <div style={{ display: "grid", gap: "12px" }}>
              {myAssignedTasks.map((t) => (
                <div
                  key={t._id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "14px 16px",
                    borderRadius: "8px",
                    border: "1px solid #e5e7eb",
                    background: "#f9fafb",
                    flexWrap: "wrap",
                    gap: "12px",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <div
                      style={{
                        width: "10px",
                        height: "10px",
                        borderRadius: "50%",
                        background:
                          t.status === "DONE"
                            ? "#10b981"
                            : t.status === "IN_PROGRESS"
                            ? "#3b82f6"
                            : t.status === "IN_REVIEW"
                            ? "#f59e0b"
                            : "#9ca3af",
                      }}
                    />
                    <div>
                      <div style={{ fontWeight: "600", fontSize: "15px", color: "#111827" }}>{t.title}</div>
                      <div style={{ fontSize: "12px", color: "#6b7280", marginTop: "2px" }}>
                        Project: <strong>{t.projectId?.name || "Workspace"}</strong> • Status: {t.status}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    {t.deadline && (
                      <span style={{ fontSize: "12px", color: "#6b7280", display: "flex", alignItems: "center", gap: "4px" }}>
                        <Calendar size={14} />
                        {new Date(t.deadline).toLocaleDateString()}
                      </span>
                    )}
                    <span
                      style={{
                        fontSize: "11px",
                        fontWeight: "600",
                        padding: "3px 8px",
                        borderRadius: "4px",
                        background:
                          t.priority === "URGENT"
                            ? "#fee2e2"
                            : t.priority === "HIGH"
                            ? "#fef3c7"
                            : "#e0f2fe",
                        color:
                          t.priority === "URGENT"
                            ? "#b91c1c"
                            : t.priority === "HIGH"
                            ? "#b45309"
                            : "#0369a1",
                      }}
                    >
                      {t.priority}
                    </span>
                    <Link
                      to={`/workspace/projects/${t.projectId?._id || t.projectId}`}
                      className="secondary-button"
                      style={{ padding: "6px 12px", fontSize: "12px" }}
                    >
                      View Board
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : filteredProjects.length === 0 ? (
        <div
          style={{
            background: "#fff",
            borderRadius: "12px",
            border: "1px dashed #d1d5db",
            padding: "50px 20px",
            textAlign: "center",
          }}
        >
          <FolderKanban size={48} style={{ color: "#9ca3af", margin: "0 auto 12px" }} />
          <h3 style={{ fontSize: "18px", fontWeight: "600", color: "#111827", marginBottom: "6px" }}>
            No projects found
          </h3>
          <p style={{ color: "#6b7280", fontSize: "14px", maxWidth: "400px", margin: "0 auto 18px" }}>
            {searchQuery
              ? "No projects matched your search criteria. Try a different search term."
              : "Get started by creating your first collaborative project workspace!"}
          </p>
          <button className="primary-button" onClick={() => setShowCreateModal(true)}>
            <Plus size={16} style={{ marginRight: "6px" }} />
            Create Project
          </button>
        </div>
      ) : (
        /* Project Cards Grid */
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))",
            gap: "20px",
          }}
        >
          {filteredProjects.map((project) => {
            const deadlineInfo = formatDeadline(project.deadline);
            const totalTasks = project.totalTasks || 0;
            const doneTasks = project.doneTasks || 0;
            const progress = project.progress || 0;

            return (
              <div
                key={project._id}
                style={{
                  background: "#fff",
                  borderRadius: "14px",
                  border: "1px solid #e5e7eb",
                  boxShadow: "0 2px 4px rgba(0,0,0,0.03)",
                  display: "flex",
                  flexDirection: "column",
                  overflow: "hidden",
                  transition: "transform 0.15s ease, box-shadow 0.15s ease",
                }}
                className="project-card"
              >
                <div style={{ padding: "20px", flexGrow: 1 }}>
                  {/* Top tags row */}
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: "12px",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "11px",
                        fontWeight: "700",
                        textTransform: "uppercase",
                        letterSpacing: "0.5px",
                        padding: "3px 8px",
                        borderRadius: "6px",
                        background: "#f3f4f6",
                        color: "#4b5563",
                      }}
                    >
                      {project.category || "General"}
                    </span>

                    <div style={{ display: "flex", gap: "6px" }}>
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
                              : project.priority === "MEDIUM"
                              ? "#e0f2fe"
                              : "#f3f4f6",
                          color:
                            project.priority === "URGENT"
                              ? "#b91c1c"
                              : project.priority === "HIGH"
                              ? "#b45309"
                              : project.priority === "MEDIUM"
                              ? "#0369a1"
                              : "#4b5563",
                        }}
                      >
                        {project.priority}
                      </span>
                      <span
                        style={{
                          fontSize: "11px",
                          fontWeight: "600",
                          padding: "3px 8px",
                          borderRadius: "6px",
                          background:
                            project.status === "COMPLETED"
                              ? "#d1fae5"
                              : project.status === "IN_PROGRESS"
                              ? "#dbeafe"
                              : "#f3f4f6",
                          color:
                            project.status === "COMPLETED"
                              ? "#065f46"
                              : project.status === "IN_PROGRESS"
                              ? "#1e40af"
                              : "#374151",
                        }}
                      >
                        {project.status === "IN_PROGRESS" ? "Active" : project.status}
                      </span>
                    </div>
                  </div>

                  {/* Project Title and Description */}
                  <Link
                    to={`/workspace/projects/${project._id}`}
                    style={{ textDecoration: "none", color: "inherit" }}
                  >
                    <h3
                      style={{
                        fontSize: "18px",
                        fontWeight: "700",
                        color: "#111827",
                        margin: "0 0 6px",
                        lineHeight: 1.3,
                      }}
                    >
                      {project.name}
                    </h3>
                  </Link>
                  <p
                    style={{
                      fontSize: "13px",
                      color: "#6b7280",
                      margin: "0 0 16px",
                      lineHeight: 1.5,
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                    }}
                  >
                    {project.description || "No description provided."}
                  </p>

                  {/* Progress Bar */}
                  <div style={{ marginBottom: "16px" }}>
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
                      <span>Progress</span>
                      <span>{progress}%</span>
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
                          width: `${progress}%`,
                          height: "100%",
                          background:
                            progress === 100
                              ? "#10b981"
                              : "linear-gradient(90deg, #10b981 0%, #3b82f6 100%)",
                          borderRadius: "999px",
                          transition: "width 0.4s ease",
                        }}
                      />
                    </div>
                  </div>

                  {/* Metadata Row: Tasks & Deadline */}
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      fontSize: "12px",
                      color: "#6b7280",
                      paddingTop: "12px",
                      borderTop: "1px solid #f3f4f6",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <CheckCircle2 size={15} style={{ color: "#10b981" }} />
                      <span>
                        {doneTasks}/{totalTasks} Tasks done
                      </span>
                    </div>

                    {deadlineInfo ? (
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "4px",
                          color: deadlineInfo.isOverdue
                            ? "#ef4444"
                            : deadlineInfo.isDueSoon
                            ? "#f59e0b"
                            : "#6b7280",
                          fontWeight: deadlineInfo.isOverdue || deadlineInfo.isDueSoon ? "600" : "400",
                        }}
                      >
                        <Clock size={14} />
                        <span>{deadlineInfo.text}</span>
                      </div>
                    ) : (
                      <span>No deadline</span>
                    )}
                  </div>
                </div>

                {/* Footer with Members and CTA */}
                <div
                  style={{
                    background: "#f9fafb",
                    padding: "12px 20px",
                    borderTop: "1px solid #e5e7eb",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center" }}>
                    <div style={{ display: "flex", marginLeft: "4px" }}>
                      {(project.members || []).slice(0, 4).map((m, idx) => (
                        <div
                          key={m.user?._id || idx}
                          title={m.user?.name || "Member"}
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
                            marginLeft: idx > 0 ? "-8px" : "0",
                          }}
                        >
                          {m.user?.name ? m.user.name.charAt(0).toUpperCase() : "U"}
                        </div>
                      ))}
                      {(project.members || []).length > 4 && (
                        <div
                          style={{
                            width: "28px",
                            height: "28px",
                            borderRadius: "50%",
                            background: "#9ca3af",
                            color: "#fff",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "10px",
                            fontWeight: "700",
                            border: "2px solid #fff",
                            marginLeft: "-8px",
                          }}
                        >
                          +{(project.members || []).length - 4}
                        </div>
                      )}
                    </div>
                  </div>

                  <Link
                    to={`/workspace/projects/${project._id}`}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                      fontSize: "13px",
                      fontWeight: "600",
                      color: "#059669",
                      textDecoration: "none",
                    }}
                  >
                    Open Board
                    <ArrowRight size={15} />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Project Modal */}
      {showCreateModal && (
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
              maxWidth: "520px",
              width: "100%",
              padding: "24px",
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
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
              <h2 style={{ fontSize: "19px", fontWeight: "700", margin: 0, color: "#111827" }}>
                Create New Project
              </h2>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                style={{
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  color: "#6b7280",
                }}
              >
                <X size={20} />
              </button>
            </div>

            {createError && (
              <div
                style={{
                  background: "#fef2f2",
                  color: "#dc2626",
                  padding: "10px 14px",
                  borderRadius: "6px",
                  fontSize: "13px",
                  marginBottom: "14px",
                }}
              >
                {createError}
              </div>
            )}

            <form onSubmit={handleCreateProject}>
              <div style={{ marginBottom: "14px" }}>
                <label style={{ display: "block", fontSize: "13px", fontWeight: "600", marginBottom: "6px", color: "#374151" }}>
                  Project Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Patient Portal Modernization"
                  value={newProject.name}
                  onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
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
                  placeholder="Brief summary of project objectives and deliverables..."
                  value={newProject.description}
                  onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
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

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "14px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: "600", marginBottom: "6px", color: "#374151" }}>
                    Category
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., Operations, Clinical"
                    value={newProject.category}
                    onChange={(e) => setNewProject({ ...newProject, category: e.target.value })}
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

                <div>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: "600", marginBottom: "6px", color: "#374151" }}>
                    Priority
                  </label>
                  <select
                    value={newProject.priority}
                    onChange={(e) => setNewProject({ ...newProject, priority: e.target.value })}
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

              <div style={{ marginBottom: "20px" }}>
                <label style={{ display: "block", fontSize: "13px", fontWeight: "600", marginBottom: "6px", color: "#374151" }}>
                  Target Deadline
                </label>
                <input
                  type="date"
                  value={newProject.deadline}
                  onChange={(e) => setNewProject({ ...newProject, deadline: e.target.value })}
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

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => setShowCreateModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="primary-button"
                  disabled={creating}
                >
                  {creating ? "Creating..." : "Create Project"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
