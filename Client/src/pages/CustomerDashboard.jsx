import { useEffect, useState } from "react";
import { ArrowRight, CalendarDays, Clock3, ListOrdered, Plus, Sparkles, Users, Building2 } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import useBusinessRealtime from "../hooks/useBusinessRealtime";
import { getMyQueue, getMyAppointments } from "../services/queueApi";

export default function CustomerDashboard() {
  const { user } = useAuth();
  const [queue, setQueue] = useState([]);
  const [appointments, setAppointments] = useState([]);

  const load = async () => {
      const [q, a] = await Promise.allSettled([getMyQueue(), getMyAppointments()]);
      if (q.status === "fulfilled") setQueue(q.value.data.queue || []);
      if (a.status === "fulfilled") setAppointments(a.value.data.appointments || []);
  };

  useEffect(() => {
    load();
    const timer = setInterval(load, 15000);
    return () => clearInterval(timer);
  }, []);

  const activeQueue = queue.find((q) => ["WAITING", "CALLED", "SERVING"].includes(q.status));
  useBusinessRealtime(activeQueue?.business?._id || activeQueue?.business, load);
  const today = new Date().toLocaleDateString("sv-SE");
  const upcoming = appointments.find((appointment) =>
    ["SCHEDULED", "CONFIRMED", "CHECKED_IN"].includes(appointment.status) && appointment.appointmentDate.slice(0, 10) >= today
  );

  return (
    <div>
      <header className="page-header dashboard-welcome">
        <div>
          <span className="eyebrow">Patient dashboard</span>
          <h1>Good to see you, {user?.name?.split(" ")[0] || "there"}.</h1>
          <p>Manage your appointments and see your place in the queue after check-in.</p>
        </div>
        <Link className="button primary" to="/book"><Plus size={16}/> Book appointment</Link>
      </header>

      <section className="stat-grid patient-stat-grid">
        <div className="stat-card">
          <div className="stat-icon"><ListOrdered size={18}/></div>
          <span>My queue</span>
          <strong>{activeQueue ? `#${activeQueue.tokenNumber}` : "Clear"}</strong>
          <small>{activeQueue ? `${activeQueue.status === "SERVING" ? "Now serving" : `Position ${activeQueue.position || "—"}`} · ${activeQueue.estimatedWaitTime || 0} min` : "No active queue"}</small>
        </div>
        <div className="stat-card">
          <div className="stat-icon"><CalendarDays size={18}/></div>
          <span>Next appointment</span>
          <strong>{upcoming ? new Date(upcoming.appointmentDate).toLocaleDateString([], { timeZone: "UTC", month:"short", day:"numeric" }) : "None"}</strong>
          <small>{upcoming ? `${upcoming.scheduledTime} · ${upcoming.department?.name || upcoming.service?.name || "Department"}${upcoming.doctor?.user?.name ? ` · Dr. ${upcoming.doctor.user.name}` : ""}` : "Nothing scheduled"}</small>
        </div>
        <div className="stat-card">
          <div className="stat-icon"><Building2 size={18}/></div>
          <span>Appointments</span>
          <strong>{appointments.length}</strong>
          <small>Appointment history</small>
        </div>
      </section>

      <div className="dashboard-grid">
        <section className="panel action-panel">
          <div className="section-heading">
            <div className="empty-icon"><Sparkles size={20}/></div>
            <div><h2>Manage your visits</h2></div>
          </div>
          <div className="quick-actions">
            <Link to="/book" className="quick-action"><Plus size={19}/><div><strong>Book an appointment</strong><span>Choose a hospital and department</span></div><ArrowRight size={17}/></Link>
            <Link to="/queue" className="quick-action"><Users size={19}/><div><strong>Track my queue</strong><span>Token, position and estimated wait</span></div><ArrowRight size={17}/></Link>
            <Link to="/appointments" className="quick-action"><CalendarDays size={19}/><div><strong>Manage appointments</strong><span>Upcoming and past hospital visits</span></div><ArrowRight size={17}/></Link>
          </div>
        </section>

        <section className="panel tip-panel">
          <span className="eyebrow">Next visit</span>
          <h2>Check in when you arrive.</h2>
          <p>Open your appointment to check in. Once you have a token, you can track your position and estimated wait.</p>
          <Link className="text-link inline-link" to="/queue">Open my queue <ArrowRight size={15}/></Link>
        </section>
      </div>
    </div>
  );
}
