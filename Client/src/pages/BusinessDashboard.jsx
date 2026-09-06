import { useEffect, useMemo, useState } from "react";
import {
  Activity, ArrowRight, BarChart3, CalendarDays, CheckCircle2, Clock3,
  ListOrdered, Play, RefreshCw, Users, XCircle, Building2
} from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { joinBusinessRoom } from "../services/socket";
import {
  callNext, completeService, getBusinessDashboard, markNoShow,
  skipQueue, startServing
} from "../services/businessApi";

const money = (value) => new Intl.NumberFormat("en-IN", {
  style: "currency", currency: "INR", maximumFractionDigits: 0,
}).format(value || 0);

function ActionButton({ title, icon: Icon, onClick, disabled }) {
  return <button className="icon-action" title={title} aria-label={title} onClick={onClick} disabled={disabled}><Icon size={15} /></button>;
}

export default function BusinessDashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const load = async (silent = false) => {
    try {
      if (!silent) setLoading(true); else setRefreshing(true);
      setError("");
      const response = await getBusinessDashboard();
      setData(response.data.dashboard);
    } catch (err) {
      setError(err.response?.data?.message || "Unable to load the hospital dashboard.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    load();
    const timer = setInterval(() => load(true), 10000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!user?.businessId) return undefined;
    return joinBusinessRoom(user.businessId, () => load(true));
  }, [user?.businessId]);

  const handle = async (action) => {
    try {
      setBusy(true);
      setError("");
      await action();
      await load(true);
    } catch (err) {
      setError(err.response?.data?.message || "That action could not be completed.");
    } finally {
      setBusy(false);
    }
  };

  const queue = data?.activeQueue || [];
  const appointments = data?.todayAppointments || [];
  const waiting = queue.filter((q) => q.status === "WAITING");
  const serving = queue.find((q) => q.status === "SERVING");
  const called = queue.find((q) => q.status === "CALLED");
  const completedToday = data?.appointmentCounts?.completed || 0;
  const completionRate = appointments.length ? Math.round((completedToday / appointments.length) * 100) : 0;

  const todayRevenue = useMemo(
    () => appointments
      .filter((a) => a.status === "COMPLETED")
      .reduce((sum, a) => sum + Number(a.service?.price || 0), 0),
    [appointments]
  );

  // Until the Doctor role is added, the backend's existing "services" are
  // presented to patients and hospital management as departments.
  const departments = useMemo(() => (data?.services || []).map((department) => {
    const rows = queue.filter((q) => String(q.service?._id) === String(department._id));
    const departmentAppointments = appointments.filter(
      (a) => String(a.service?._id) === String(department._id)
    );
    return {
      ...department,
      waiting: rows.filter((q) => q.status === "WAITING").length,
      active: rows.some((q) => ["CALLED", "SERVING"].includes(q.status)),
      appointments: departmentAppointments.length,
      completed: departmentAppointments.filter((a) => a.status === "COMPLETED").length,
      revenue: departmentAppointments
        .filter((a) => a.status === "COMPLETED")
        .reduce((sum, a) => sum + Number(a.service?.price || 0), 0),
    };
  }), [data, queue, appointments]);

  if (loading) return <section className="panel loading-panel">Preparing the hospital dashboard...</section>;

  return (
    <div className="manager-dashboard">
      <header className="page-header dashboard-welcome">
        <div>
          <span className="eyebrow"><Building2 size={13} /> Hospital management</span>
          <h1>{data?.business?.name || "AIMA Hospital"}</h1>
          <p>One hospital view for appointments, department queues, patients, and today's operational numbers.</p>
        </div>
        <div className="dashboard-header-actions">
          <span className="live-pill online"><Activity size={14} /> Live</span>
          <button className="button secondary" onClick={() => load(true)} disabled={refreshing}>
            <RefreshCw size={15} className={refreshing ? "spin" : ""} /> Refresh
          </button>
        </div>
      </header>

      {error && <div className="error-box page-error">{error}</div>}

      <section className="stat-grid business-stats easy-stats">
        <div className="stat-card stat-focus">
          <div className="stat-icon"><Users size={18} /></div>
          <span>Patients scheduled today</span>
          <strong>{data?.customerCount || appointments.length || 0}</strong>
          <small>{waiting.length} currently waiting in live queues</small>
        </div>
        <div className="stat-card">
          <div className="stat-icon"><CalendarDays size={18} /></div>
          <span>Appointments scheduled today</span>
          <strong>{appointments.length}</strong>
          <small>{completedToday} completed · {data?.appointmentCounts?.noShows || 0} no-shows</small>
        </div>
        <div className="stat-card">
          <div className="stat-icon"><ListOrdered size={18} /></div>
          <span>Patients currently in queue</span>
          <strong>{data?.queueCounts?.total || queue.length}</strong>
          <small>{data?.queueCounts?.WAITING || waiting.length} waiting · {data?.queueCounts?.SERVING || 0} serving</small>
        </div>
        <div className="stat-card">
          <div className="stat-icon"><BarChart3 size={18} /></div>
          <span>Collected revenue today</span>
          <strong>{money(todayRevenue)}</strong>
          <small>Based on completed appointments</small>
        </div>
      </section>

      <section className="manager-hero-grid">
        <section className="panel next-customer-card">
          <div className="next-card-top">
            <div><span className="eyebrow">Live operations</span><h2>{serving ? "Patient currently being served" : called ? "Patient has been called" : "Department queues"}</h2></div>
            <div className="next-card-icon"><ListOrdered size={20} /></div>
          </div>
          {serving ? (
            <div className="next-empty">
              <CheckCircle2 size={25} />
              <div><strong>Token #{serving.tokenNumber}</strong><span>{serving.customer?.name || "Patient"} · {serving.service?.name || "Department"}</span></div>
            </div>
          ) : called ? (
            <div className="next-empty">
              <Activity size={25} />
              <div><strong>Token #{called.tokenNumber}</strong><span>{called.customer?.name || "Patient"} is waiting to be started.</span></div>
            </div>
          ) : (
            <div className="next-empty"><CheckCircle2 size={25} /><div><strong>{waiting.length ? `${waiting.length} patients waiting` : "No one is waiting"}</strong><span>Monitor each department below or open the live queue.</span></div></div>
          )}
          <Link className="button primary wide-action" to="/queue"><ListOrdered size={16} /> Open queue monitor</Link>
        </section>

        <section className="panel today-progress-card">
          <div className="panel-title-row"><div><span className="eyebrow">Today's progress</span><h2>Hospital performance</h2></div><span className="progress-percent">{completionRate}%</span></div>
          <div className="progress-track"><i style={{ width: `${completionRate}%` }} /></div>
          <div className="progress-grid">
            <div><strong>{completedToday}</strong><span>Completed</span></div>
            <div><strong>{data?.appointmentCounts?.cancelled || 0}</strong><span>Cancelled</span></div>
            <div><strong>{data?.appointmentCounts?.noShows || 0}</strong><span>No-shows</span></div>
            <div><strong>{money(todayRevenue)}</strong><span>Revenue</span></div>
          </div>
          <Link className="text-link inline-link" to="/analytics">View department insights <ArrowRight size={14} /></Link>
        </section>
      </section>

      <section className="panel">
        <div className="panel-title-row">
          <div><span className="eyebrow">Hospital structure</span><h2>Departments today</h2></div>
          <span className="live-pill">{departments.length} departments</span>
        </div>

        <div className="service-stack">
          {departments.map((department) => (
            <div className="service-row" key={department._id}>
              <div>
                <strong>{department.name}</strong>
                <span>{department.appointments} appointments · {department.completed} completed</span>
              </div>
              <div className="service-row-side">
                <span className={`workload-dot ${department.active ? "busy" : ""}`}>
                  <i /> {department.waiting ? `${department.waiting} waiting` : department.active ? "Active" : "Clear"}
                </span>
                <strong>{money(department.revenue)}</strong>
              </div>
            </div>
          ))}
          {!departments.length && <p className="muted">No departments are configured for this hospital yet.</p>}
        </div>
      </section>

      <section className="panel business-queue-panel">
        <div className="panel-title-row">
          <div><span className="eyebrow">Live monitoring</span><h2>Patients currently receiving service</h2></div>
          <Link className="text-link inline-link" to="/queue">Open full queue <ArrowRight size={14} /></Link>
        </div>
        <div className="queue-status-strip">
          <span><b>{waiting.length}</b> waiting</span>
          <span><b>{data?.queueCounts?.CALLED || 0}</b> called</span>
          <span><b>{data?.queueCounts?.SERVING || 0}</b> serving</span>
        </div>
        <div className="queue-table">
          {queue.length === 0 ? <div className="empty-inline"><CheckCircle2 size={18} /> All department queues are clear.</div> : queue.slice(0, 10).map((entry) => (
            <div className="business-queue-row" key={entry._id}>
              <div className="business-token">#{entry.tokenNumber}</div>
              <div><strong>{entry.customer?.name || "Patient"}</strong><span>{entry.service?.name || "Department"} · {entry.estimatedWaitTime || 0} min</span></div>
              <span className={`status-badge status-${entry.status.toLowerCase()}`}>{entry.status.replace("_", " ")}</span>
              <div className="queue-controls">
                {entry.status === "WAITING" && <ActionButton title="Call patient" icon={Play} disabled={busy} onClick={() => handle(() => callNext(user.businessId, entry.service?._id))} />}
                {entry.status === "CALLED" && <><ActionButton title="Start visit" icon={Play} disabled={busy} onClick={() => handle(() => startServing(entry._id))} /><ActionButton title="Mark no-show" icon={XCircle} disabled={busy} onClick={() => handle(() => markNoShow(entry._id))} /></>}
                {entry.status === "SERVING" && <ActionButton title="Complete visit" icon={CheckCircle2} disabled={busy} onClick={() => handle(() => completeService(entry._id))} />}
                {entry.status === "WAITING" && <ActionButton title="Skip patient" icon={ArrowRight} disabled={busy} onClick={() => handle(() => skipQueue(entry._id))} />}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="panel today-schedule-panel">
        <div className="panel-title-row">
          <div><span className="eyebrow">Hospital schedule</span><h2>Appointments scheduled today</h2></div>
          <Link className="text-link inline-link" to="/appointments">View all <ArrowRight size={14} /></Link>
        </div>
        {appointments.length === 0 ? (
          <div className="empty-schedule"><CalendarDays size={22} /><div><strong>No appointments today</strong><span>New patient bookings will appear here automatically.</span></div></div>
        ) : (
          <div className="schedule-list">
            {appointments.slice().sort((a, b) => String(a.scheduledTime || "").localeCompare(String(b.scheduledTime || ""))).slice(0, 10).map((a) => (
              <div className="schedule-row" key={a._id}>
                <div className="schedule-time">{a.scheduledTime}</div>
                <div className="schedule-person"><strong>{a.customer?.name || "Patient"}</strong><span>{a.service?.name || "Department"}</span></div>
                {a.queueEntry && <span className="token-chip">#{a.queueEntry.tokenNumber}</span>}
                <span className={`status-badge status-${a.status.toLowerCase()}`}>{a.status.replace("_", " ")}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="dashboard-shortcuts">
        <Link className="shortcut-card" to="/appointments"><CalendarDays size={18} /><div><strong>Hospital visit schedule</strong><span>See the hospital schedule and statuses</span></div><ArrowRight size={16} /></Link>
        <Link className="shortcut-card" to="/queue"><ListOrdered size={18} /><div><strong>Active department queues</strong><span>Monitor patients as queues move</span></div><ArrowRight size={16} /></Link>
        <Link className="shortcut-card" to="/analytics"><BarChart3 size={18} /><div><strong>Hospital insights</strong><span>Demand, wait time and performance</span></div><ArrowRight size={16} /></Link>
      </section>
    </div>
  );
}
