import { useEffect, useMemo, useState } from "react";
import {
  Activity, ArrowRight, BarChart3, Building2, CalendarDays, CheckCircle2,
  Clock3, ListOrdered, RefreshCw, UserCog, Users, WalletCards, Stethoscope
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import api from "../services/api";

const money = (value) => new Intl.NumberFormat("en-IN", {
  style: "currency", currency: "INR", maximumFractionDigits: 0,
}).format(Number(value || 0));
const statusOf = (value) => String(value || "").toUpperCase();

export default function HospitalAdminDashboard() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const load = async (silent = false) => {
    try {
      silent ? setRefreshing(true) : setLoading(true);
      setError("");
      const { data: response } = await api.get("/business/dashboard");
      setData(response?.dashboard || {});
    } catch (err) {
      setError(err?.response?.data?.message || "Unable to load the hospital dashboard.");
      setData({});
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

  const departments = data?.departments || [];
  const doctors = data?.doctors || [];
  const appointments = data?.todayAppointments || [];
  const queue = data?.activeQueue || [];
  const counts = data?.appointmentCounts || {};
  const queueCounts = data?.queueCounts || {};
  const weekly = data?.weeklyVolume || [];
  const maxWeekly = Math.max(...weekly.map((day) => day.appointments || 0), 1);

  const busiestDepartment = useMemo(() => {
    return [...departments].sort((a, b) => (b.appointmentCount || 0) - (a.appointmentCount || 0))[0];
  }, [departments]);

  if (loading) return <section className="panel loading-panel">Preparing the hospital control center...</section>;

  return (
    <div className="manager-dashboard">
      <header className="page-header dashboard-welcome">
        <div>
          <span className="eyebrow"><Building2 size={13} /> Hospital management</span>
          <h1>{data?.business?.name || "AIMA Hospital"}</h1>
          <p>One screen for today's operations, doctors, departments, queues and revenue.</p>
        </div>
        <div className="dashboard-header-actions">
          <span className="live-pill online"><Activity size={14} /> Live</span>
          <button className="button secondary" onClick={() => load(true)} disabled={refreshing}>
            <RefreshCw size={15} className={refreshing ? "spin" : ""} /> {refreshing ? "Refreshing..." : "Refresh"}
          </button>
        </div>
      </header>

      {error && <div className="error-box page-error">{error}</div>}

      <section className="stat-grid business-stats easy-stats admin-kpi-grid">
        <div className="stat-card"><div className="stat-icon"><Users size={18} /></div><span>Patients scheduled today</span><strong>{data?.uniqueTodayPatients || 0}</strong><small>Unique patients with appointments</small></div>
        <div className="stat-card"><div className="stat-icon"><CalendarDays size={18} /></div><span>Appointments scheduled today</span><strong>{counts.total || 0}</strong><small>{counts.completed || 0} completed · {counts.pending || 0} pending</small></div>
        <div className="stat-card"><div className="stat-icon"><ListOrdered size={18} /></div><span>Active queue</span><strong>{queueCounts.total || 0}</strong><small>{queueCounts.waiting || 0} waiting · {queueCounts.serving || 0} serving</small></div>
        <div className="stat-card"><div className="stat-icon"><WalletCards size={18} /></div><span>Collected revenue today</span><strong>{money(data?.revenue?.today)}</strong><small>{money(data?.revenue?.last30Days)} completed in 30 days</small></div>
      </section>

      <section className="admin-overview-grid">
        <section className="panel admin-live-panel">
          <div className="panel-title-row">
            <div><span className="eyebrow">Operations now</span><h2>Live hospital queue</h2></div>
            <Link className="text-link inline-link" to="/queue">Open queue <ArrowRight size={14} /></Link>
          </div>
          <div className="admin-queue-summary">
            <div><strong>{queueCounts.waiting || 0}</strong><span>Awaiting service</span></div>
            <div><strong>{queueCounts.called || 0}</strong><span>Patient called</span></div>
            <div><strong>{queueCounts.serving || 0}</strong><span>In consultation</span></div>
          </div>
          {queue.length ? <div className="admin-mini-list">
            {queue.slice(0, 6).map((entry) => (
              <div className="admin-mini-row" key={entry._id}>
                <span className="token-chip">#{entry.tokenNumber}</span>
                <div><strong>{entry.customer?.name || "Patient"}</strong><span>{entry.doctor?.user?.name || "Doctor"} · {entry.department?.name || "Department"}</span></div>
                <span className="status-badge">{statusOf(entry.status).replaceAll("_", " ")}</span>
              </div>
            ))}
          </div> : <div className="empty-schedule"><ListOrdered size={22} /><div><strong>No patients are currently in the active queue</strong><span>Patients who complete check-in will appear here.</span></div></div>}
        </section>

        <section className="panel admin-team-panel">
          <div className="panel-title-row"><div><span className="eyebrow">Clinical team</span><h2>Doctors</h2></div><Link className="text-link inline-link" to="/admin/doctors">Manage <ArrowRight size={14} /></Link></div>
          <div className="admin-team-stats"><div><strong>{data?.activeDoctorCount || 0}</strong><span>Active doctors</span></div><div><strong>{data?.doctorCount || 0}</strong><span>Total doctors</span></div><div><strong>{departments.length}</strong><span>Departments</span></div></div>
          <div className="admin-doctor-list">
            {doctors.slice(0, 5).map((doctor) => <div className="admin-doctor-row" key={doctor.id}><div className="doctor-avatar"><Stethoscope size={15} /></div><div><strong>{doctor.name}</strong><span>{doctor.designation} · {doctor.department}</span></div><b>{doctor.activeQueue ? `${doctor.activeQueue} queue` : "Clear"}</b></div>)}
            {!doctors.length && <p className="muted">No doctor accounts have been created yet.</p>}
          </div>
        </section>
      </section>

      <section className="panel">
        <div className="panel-title-row"><div><span className="eyebrow">Performance</span><h2>Department activity</h2></div><Link className="text-link inline-link" to="/admin/departments">Manage departments <ArrowRight size={14} /></Link></div>
        <div className="admin-department-table">
          {departments.map((department) => {
            const loadPercent = Math.min(((department.appointmentCount || 0) / Math.max(counts.total || 1, 1)) * 100, 100);
            return <div className="admin-department-row" key={department._id}>
              <div className="department-main"><div className="department-code">{department.code}</div><div><strong>{department.name}</strong><span>{department.doctorCount || 0} doctors · {department.waitingCount || 0} waiting</span></div></div>
              <div className="department-meter"><div><i style={{ width: `${loadPercent}%` }} /></div><span>{department.appointmentCount || 0} appointments</span></div>
              <div className="department-result"><strong>{department.completedCount || 0}</strong><span>completed</span></div>
              <div className="department-result"><strong>{money(department.revenue)}</strong><span>revenue</span></div>
            </div>;
          })}
          {!departments.length && <div className="empty-schedule"><Building2 size={22} /><div><strong>No departments configured</strong><span>Create departments before adding doctor accounts.</span></div></div>}
        </div>
        {busiestDepartment && <div className="admin-insight"><BarChart3 size={16} /><span><strong>{busiestDepartment.name}</strong> is the busiest department today with {busiestDepartment.appointmentCount || 0} appointments.</span></div>}
      </section>

      <section className="admin-bottom-grid">
        <section className="panel">
          <div className="panel-title-row"><div><span className="eyebrow">Last 7 days</span><h2>Visit volume</h2></div><Link className="text-link inline-link" to="/analytics">Full analytics <ArrowRight size={14} /></Link></div>
          <div className="admin-volume-chart">
            {weekly.map((day) => <div className="volume-column" key={day.date}><div className="volume-bar-wrap"><i style={{ height: `${Math.max((day.appointments / maxWeekly) * 100, day.appointments ? 8 : 2)}%` }} /></div><strong>{day.appointments}</strong><span>{new Date(`${day.date}T12:00:00`).toLocaleDateString("en-IN", { weekday: "short" })}</span></div>)}
          </div>
        </section>

        <section className="panel">
          <div className="panel-title-row"><div><span className="eyebrow">Today</span><h2>Upcoming visits</h2></div><Link className="text-link inline-link" to="/appointments">View all <ArrowRight size={14} /></Link></div>
          <div className="schedule-list admin-upcoming-list">
            {(data?.upcomingAppointments || []).slice(0, 6).map((appointment) => <div className="schedule-row" key={appointment._id}><div className="schedule-time">{appointment.scheduledTime || "--"}</div><div className="schedule-person"><strong>{appointment.customer?.name || "Patient"}</strong><span>{appointment.doctor?.user?.name || "Doctor"} · {appointment.department?.name || "Department"}</span></div><span className="status-badge">{statusOf(appointment.status).replaceAll("_", " ")}</span></div>)}
            {!data?.upcomingAppointments?.length && <div className="empty-schedule"><CalendarDays size={22} /><div><strong>No upcoming appointments</strong><span>The schedule is clear for now.</span></div></div>}
          </div>
        </section>
      </section>

      <section className="dashboard-shortcuts">
        <Link className="shortcut-card" to="/admin/departments"><Building2 size={18} /><div><strong>Departments</strong><span>Create and manage departments</span></div><ArrowRight size={16} /></Link>
        <Link className="shortcut-card" to="/admin/doctors"><UserCog size={18} /><div><strong>Doctors</strong><span>Create and manage doctor accounts</span></div><ArrowRight size={16} /></Link>
        <button className="shortcut-card" onClick={() => navigate("/appointments")}><CalendarDays size={18} /><div><strong>Appointments</strong><span>Manage hospital bookings</span></div><ArrowRight size={16} /></button>
        <button className="shortcut-card" onClick={() => navigate("/analytics")}><BarChart3 size={18} /><div><strong>Analytics</strong><span>Detailed hospital performance</span></div><ArrowRight size={16} /></button>
      </section>
    </div>
  );
}
