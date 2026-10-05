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
  const myAssignedTasks = dashboard?.myAssignedTasks || [];

  return (
    <div className="workspace-page" style={{ maxWidth: "1400px", margin: "0 auto" }}>
      {/* Page Header */}
      <div className="page-header">
        <div>
          <span className="eyebrow"><FolderKanban size={14} /> Project Workspace</span>
          <h1>Initiatives & Operations</h1>
          <p>Collaborate on hospital workflows, track tasks, manage deadlines, and sync in real time.</p>
        </div>

        <button
          className="button primary"
          onClick={() => setShowCreateModal(true)}
        >
          <Plus size={17} />
          New Project
        </button>
      </div>

      {/* Workspace Metric KPI Cards */}
      <section className="stat-grid" style={{ marginBottom: "26px" }}>
        <div className="stat-card">
          <div className="stat-icon"><FolderKanban size={18} /></div>
          <span>Active Projects</span>
          <strong>{summary.activeProjects || 0}</strong>
          <small>{summary.completedProjects || 0} completed · {summary.totalProjects || 0} total</small>
        </div>

        <div className="stat-card">
          <div className="stat-icon"><Clock size={18} /></div>
          <span>Tasks In Progress</span>
          <strong>{tasksByStatus.IN_PROGRESS || 0}</strong>
          <small>{tasksByStatus.TODO || 0} To-Do · {tasksByStatus.IN_REVIEW || 0} In Review</small>
        </div>

        <div className="stat-card">
          <div className="stat-icon"><TrendingUp size={18} /></div>
          <span>Completion Rate</span>
          <strong>{summary.completionRate || 0}%</strong>
          <small>{tasksByStatus.DONE || 0} of {summary.totalTasks || 0} tasks finished</small>
        </div>

        <div className="stat-card">
          <div className="stat-icon"><ListTodo size={18} /></div>
          <span>Assigned To Me</span>
          <strong>{summary.myAssignedCount || 0}</strong>
          <small>Action items for your attention</small>
        </div>
      </section>

      {/* Tabs and Filters Bar */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "14px",
          marginBottom: "24px",
          background: "var(--warm-cream)",
          padding: "12px 18px",
          borderRadius: "var(--radius-card)",
          border: "1px solid var(--border-subtle)",
          boxShadow: "var(--shadow-xs)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
          <button
            onClick={() => setActiveTab("all")}
            className={`button ${activeTab === "all" ? "primary small" : "secondary small"}`}
          >
            All Projects ({projects.length})
          </button>
          <button
            onClick={() => setActiveTab("active")}
            className={`button ${activeTab === "active" ? "primary small" : "secondary small"}`}
          >
            Active ({summary.activeProjects || 0})
          </button>
          <button
            onClick={() => setActiveTab("completed")}
            className={`button ${activeTab === "completed" ? "primary small" : "secondary small"}`}
          >
            Completed ({summary.completedProjects || 0})
          </button>
          <button
            onClick={() => setActiveTab("mytasks")}
            className={`button ${activeTab === "mytasks" ? "primary small" : "secondary small"}`}
          >
            My Tasks ({summary.myAssignedCount || 0})
          </button>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap", flexGrow: 1, justifyContent: "flex-end" }}>
          {/* Search Box */}
          <div style={{ position: "relative", minWidth: "200px" }}>
            <Search
              size={15}
              style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "var(--text-subtle)" }}
            />
            <input
              type="text"
              placeholder="Search projects..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                paddingLeft: "32px",
                fontSize: "13px",
              }}
            />
          </div>

          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            style={{ width: "auto", fontSize: "13px" }}
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
            style={{ width: "auto", fontSize: "13px" }}
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
        <div style={{ textAlign: "center", padding: "60px 0", color: "var(--text-muted)" }}>
          <p>Loading project workspace...</p>
        </div>
      ) : error ? (
        <div className="error-box page-error">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      ) : activeTab === "mytasks" ? (
        /* My Assigned Tasks Tab View */
        <div className="panel" style={{ padding: "24px" }}>
          <h2 style={{ fontSize: "18px", marginBottom: "16px" }}>
            My Assigned Tasks ({myAssignedTasks.length})
          </h2>
          {myAssignedTasks.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 0", color: "var(--text-muted)" }}>
              <CheckSquare size={38} style={{ margin: "0 auto 10px", color: "var(--text-subtle)" }} />
              <p style={{ margin: 0, fontWeight: "600" }}>You have no tasks assigned right now.</p>
              <p style={{ fontSize: "13px", color: "var(--text-subtle)" }}>Pick tasks from any project workspace board!</p>
            </div>
          ) : (
            <div style={{ display: "grid", gap: "10px" }}>
              {myAssignedTasks.map((t) => (
                <div
                  key={t._id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "14px 16px",
                    borderRadius: "var(--radius-md)",
                    border: "1px solid var(--border-subtle)",
                    background: "var(--cream-light)",
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
                            ? "var(--success)"
                            : t.status === "IN_PROGRESS"
                            ? "var(--primary-green)"
                            : t.status === "IN_REVIEW"
                            ? "var(--warning)"
                            : "var(--text-subtle)",
                      }}
                    />
                    <div>
                      <div style={{ fontWeight: "700", fontSize: "14px", color: "var(--text-primary)" }}>{t.title}</div>
                      <div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "2px" }}>
                        Project: <strong>{t.projectId?.name || "Workspace"}</strong> • Status: {t.status}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    {t.deadline && (
                      <span style={{ fontSize: "12px", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "4px" }}>
                        <Calendar size={13} />
                        {new Date(t.deadline).toLocaleDateString()}
                      </span>
                    )}
                    <span
                      className={`badge ${
                        t.priority === "URGENT"
                          ? "badge-danger"
                          : t.priority === "HIGH"
                          ? "badge-warning"
                          : "badge-info"
                      }`}
                    >
                      {t.priority}
                    </span>
                    <Link
                      to={`/workspace/projects/${t.projectId?._id || t.projectId}`}
                      className="button secondary small"
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
          className="panel"
          style={{
            borderStyle: "dashed",
            padding: "50px 20px",
            textAlign: "center",
          }}
        >
          <FolderKanban size={44} style={{ color: "var(--text-subtle)", margin: "0 auto 12px" }} />
          <h3 style={{ fontSize: "18px", marginBottom: "6px" }}>
            No projects found
          </h3>
          <p style={{ color: "var(--text-muted)", fontSize: "14px", maxWidth: "420px", margin: "0 auto 20px" }}>
            {searchQuery
              ? "No projects matched your search criteria. Try a different search term."
              : "Get started by creating your first collaborative project workspace!"}
          </p>
          <button className="button primary" onClick={() => setShowCreateModal(true)}>
            <Plus size={16} />
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
                className="project-card"
                style={{
                  display: "flex",
                  flexDirection: "column",
                  overflow: "hidden",
                }}
              >
                <div style={{ padding: "22px", flexGrow: 1 }}>
                  {/* Top tags row */}
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: "14px",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "11px",
                        fontWeight: "750",
                        textTransform: "uppercase",
                        letterSpacing: "0.06em",
                        padding: "3px 8px",
                        borderRadius: "6px",
                        background: "var(--pistachio-soft)",
                        color: "var(--primary-forest)",
                        border: "1px solid var(--border-green)",
                      }}
                    >
                      {project.category || "General"}
                    </span>

                    <div style={{ display: "flex", gap: "6px" }}>
                      <span
                        className={`badge ${
                          project.priority === "URGENT"
                            ? "badge-danger"
                            : project.priority === "HIGH"
                            ? "badge-warning"
                            : "badge-info"
                        }`}
                      >
                        {project.priority}
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
                        fontWeight: "750",
                        color: "var(--text-primary)",
                        margin: "0 0 8px",
                        lineHeight: 1.3,
                      }}
                    >
                      {project.name}
                    </h3>
                  </Link>
                  <p
                    style={{
                      fontSize: "13px",
                      color: "var(--text-muted)",
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
                        fontWeight: "650",
                        color: "var(--primary-forest)",
                        marginBottom: "6px",
                      }}
                    >
                      <span>Progress</span>
                      <span>{progress}%</span>
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
                          width: `${progress}%`,
                          height: "100%",
                          background:
                            progress === 100
                              ? "var(--success)"
                              : "linear-gradient(90deg, var(--primary-green) 0%, var(--primary-forest) 100%)",
                          borderRadius: "var(--radius-pill)",
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
                      color: "var(--text-muted)",
                      paddingTop: "12px",
                      borderTop: "1px solid var(--border-subtle)",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <CheckCircle2 size={15} style={{ color: "var(--primary-green)" }} />
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
                            ? "var(--danger)"
                            : deadlineInfo.isDueSoon
                            ? "var(--warning)"
                            : "var(--text-muted)",
                          fontWeight: deadlineInfo.isOverdue || deadlineInfo.isDueSoon ? "700" : "500",
                        }}
                      >
                        <Clock size={13} />
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
                    background: "var(--cream-light)",
                    padding: "12px 22px",
                    borderTop: "1px solid var(--border-subtle)",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center" }}>
                    <div style={{ display: "flex" }}>
                      {(project.members || []).slice(0, 4).map((m, idx) => (
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
                            background: "var(--text-subtle)",
                            color: "#ffffff",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "10px",
                            fontWeight: "700",
                            border: "2px solid var(--warm-cream)",
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
                      fontWeight: "700",
                      color: "var(--primary-forest)",
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
              maxWidth: "520px",
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
                marginBottom: "20px",
              }}
            >
              <h2 style={{ fontSize: "19px", fontWeight: "750", margin: 0, color: "var(--text-primary)" }}>
                Create New Project
              </h2>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                style={{
                  color: "var(--text-muted)",
                }}
              >
                <X size={20} />
              </button>
            </div>

            {createError && (
              <div className="error-box page-error">
                <AlertCircle size={16} />
                <span>{createError}</span>
              </div>
            )}

            <form onSubmit={handleCreateProject}>
              <div className="field">
                <label>Project Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Patient Triage Modernization"
                  value={newProject.name}
                  onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                />
              </div>

              <div className="field">
                <label>Description</label>
                <textarea
                  rows={3}
                  placeholder="Brief summary of project objectives and deliverables..."
                  value={newProject.description}
                  onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                />
              </div>

              <div className="form-two">
                <div className="field">
                  <label>Category</label>
                  <input
                    type="text"
                    placeholder="e.g., Operations, Clinical"
                    value={newProject.category}
                    onChange={(e) => setNewProject({ ...newProject, category: e.target.value })}
                  />
                </div>

                <div className="field">
                  <label>Priority</label>
                  <select
                    value={newProject.priority}
                    onChange={(e) => setNewProject({ ...newProject, priority: e.target.value })}
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent</option>
                  </select>
                </div>
              </div>

              <div className="field" style={{ marginBottom: "22px" }}>
                <label>Target Deadline</label>
                <input
                  type="date"
                  value={newProject.deadline}
                  onChange={(e) => setNewProject({ ...newProject, deadline: e.target.value })}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                <button
                  type="button"
                  className="button secondary"
                  onClick={() => setShowCreateModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="button primary"
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
