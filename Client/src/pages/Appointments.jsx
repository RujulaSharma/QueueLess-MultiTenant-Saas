import { useEffect, useState } from "react";
import { CalendarDays, Clock3, MapPin, Plus, XCircle, Radio, CheckCircle2, PlayCircle, Stethoscope } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import { cancelAppointment, checkInAppointment, getMyAppointments } from "../services/queueApi";
import { getBusinessAppointments, updateAppointmentStatus } from "../services/businessApi";

const statusClass = (status) => `status-badge status-${status?.toLowerCase()}`;
const hospitalRoles = ["ADMIN", "STAFF"];

export default function Appointments() {
  const { user } = useAuth();
  const isHospital = hospitalRoles.includes(user?.role);
  const isDoctor = user?.role === "DOCTOR";
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [filter, setFilter] = useState("ALL");

  const load = async () => {
    try {
      setError("");
      if (isDoctor) {
        const response = await api.get("/doctor/dashboard");
        setAppointments(response.data.appointments || []);
      } else {
        const response = isHospital
          ? await getBusinessAppointments(user.businessId)
          : await getMyAppointments();
        setAppointments(response.data.appointments || []);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Could not load appointments");
    } finally { setLoading(false); }
  };

  useEffect(() => {
    if (!user) return;
    load();
    const timer = setInterval(load, 5000);
    return () => clearInterval(timer);
  }, [user?.role, user?.businessId]);

  const cancel = async (id) => {
    if (!window.confirm("Cancel this appointment?")) return;
    try { setBusyId(id); await cancelAppointment(id); setNotice("Appointment cancelled."); await load(); }
    catch (err) { setError(err.response?.data?.message || "Could not cancel appointment"); }
    finally { setBusyId(null); }
  };

  const checkIn = async (id) => {
    try {
      setBusyId(id); setError("");
      const { data } = await checkInAppointment(id);
      localStorage.setItem("queueless_business_id", data.queueEntry?.business?._id || data.appointment?.business?._id || "");
      localStorage.setItem("queueless_service_id", data.queueEntry?.service?._id || data.appointment?.service?._id || "");
      setNotice(`Checked in successfully. Token #${data.queueEntry?.tokenNumber}.`);
      await load();
    } catch (err) { setError(err.response?.data?.message || "Could not check in"); }
    finally { setBusyId(null); }
  };

  const visibleAppointments = isHospital
    ? appointments.filter((a) => {
        if (filter === "ALL") return true;
        const day = new Date(a.appointmentDate);
        const today = new Date();
        const sameDay = day.toDateString() === today.toDateString();
        if (filter === "TODAY") return sameDay;
        if (filter === "UPCOMING") return day >= new Date(today.getFullYear(), today.getMonth(), today.getDate()) && !["COMPLETED", "CANCELLED", "NO_SHOW"].includes(a.status);
        return a.status === filter;
      })
    : appointments;

  const setStatus = async (id, status) => {
    try {
      setBusyId(id); setError("");
      if (isDoctor) {
        await api.patch(`/doctor/dashboard/appointments/${id}/status`, { status });
      } else {
        await updateAppointmentStatus(id, status);
      }
      setNotice(`Appointment marked ${status.replace("_", " ").toLowerCase()}.`);
      await load();
    }
    catch (err) { setError(err.response?.data?.message || "Could not update appointment"); }
    finally { setBusyId(null); }
  };

  return <div>
    <header className="page-header">
      <div><span className="eyebrow">{isHospital ? "Hospital appointment schedule" : isDoctor ? "Doctor schedule" : "Patient appointments"}</span><h1>{isHospital ? "Hospital visit schedule" : isDoctor ? "Consultation appointments" : "My appointments"}</h1><p>{isHospital ? "Review all scheduled visits across the hospital and track their status." : isDoctor ? "Review and manage consultations assigned to you." : "Review your appointments, check in, and follow your queue status."}</p></div>
      {!isHospital && <Link className="button primary" to="/book"><Plus size={17}/> New appointment</Link>}
    </header>
    {notice && <div className="success-box">{notice}</div>}
    {error && <div className="error-box page-error">{error}</div>}

    {isHospital && <div className="filter-tabs" style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
      {["ALL", "TODAY", "UPCOMING", "COMPLETED", "CANCELLED", "NO_SHOW"].map((item) => <button key={item} className={`button ${filter === item ? "primary" : "secondary"} small-button`} onClick={() => setFilter(item)}>{item.replace("_", " ")}</button>)}
    </div>}
    <section className="appointment-list">
      {loading ? <div className="panel loading-panel">Loading appointments...</div> : visibleAppointments.length === 0 ? (
        <div className="panel empty-panel"><div className="empty-icon"><CalendarDays size={22}/></div><h2>{isHospital ? "No appointments in this view" : "Your calendar is clear"}</h2><p>{isHospital ? "Try another filter. Completed appointments remain available under Completed or All." : "Book a department visit and QueueLess will keep the appointment, check-in, and live queue in one place."}</p>{!isHospital && <Link className="button primary" to="/book"><Plus size={17}/> Book your first appointment</Link>}</div>
      ) : visibleAppointments.map((a) => (
        <article className="panel appointment-card" key={a._id}>
          <div className="appointment-main"><div className="appointment-icon"><CalendarDays size={20}/></div><div><span className="eyebrow">{a.department?.name || a.service?.name || "Department"}</span><h2>{isHospital || isDoctor ? (a.customer?.name || "Customer") : (a.business?.name || "Hospital")}</h2>{!isHospital && !isDoctor && a.doctor?.user?.name && <div className="meta-row"><span><Stethoscope size={14}/> {a.doctor.user.name}</span><span>{a.doctor.designation || "Doctor"}</span></div>}{isDoctor && a.doctor?.designation && <div className="meta-row"><span><Stethoscope size={14}/> {a.doctor.designation}</span></div>}<div className="meta-row"><span><CalendarDays size={14}/> {new Date(a.appointmentDate).toLocaleDateString()}</span><span><Clock3 size={14}/> {a.scheduledTime}</span>{(a.business?.category || isHospital) && <span><MapPin size={14}/> {a.business?.category || "Hospital"}</span>}</div></div></div>
          <div className="appointment-side">
            <span className={statusClass(a.status)}>{a.status.replaceAll("_", " ")}</span>
            {a.queueEntry && <span className="status-badge status-serving"><Radio size={13}/> Token #{a.queueEntry.tokenNumber}</span>}
            {!isHospital && a.status === "CONFIRMED" && !a.queueEntry && <button className="button secondary small-button" disabled={busyId===a._id} onClick={() => checkIn(a._id)}><Radio size={15}/> {busyId===a._id ? "Checking in..." : "Check in"}</button>}
            {!isHospital && a.status === "CHECKED_IN" && a.queueEntry && <Link className="button secondary small-button" to="/queue">View live queue</Link>}
            {isHospital && a.status === "CONFIRMED" && <button className="button secondary small-button" disabled={busyId===a._id} onClick={() => setStatus(a._id,"CHECKED_IN")}><Radio size={15}/> Check in</button>}
            {isHospital && a.status === "CHECKED_IN" && <Link className="button secondary small-button" to="/queue"><PlayCircle size={15}/> Open queue</Link>}
            {isHospital && a.status === "SCHEDULED" && <button className="button secondary small-button" disabled={busyId===a._id} onClick={() => setStatus(a._id,"CONFIRMED")}><CheckCircle2 size={15}/> Confirm</button>}
            {isDoctor && a.status === "SCHEDULED" && <button className="button secondary small-button" disabled={busyId===a._id} onClick={() => setStatus(a._id,"CONFIRMED")}><CheckCircle2 size={15}/> Confirm</button>}
            {isDoctor && ["SCHEDULED","CONFIRMED","CHECKED_IN"].includes(a.status) && <button className="ghost-button danger" disabled={busyId===a._id} onClick={() => setStatus(a._id,"NO_SHOW")}><XCircle size={15}/> No-show</button>}
            {(!isHospital && ["SCHEDULED","CONFIRMED"].includes(a.status)) && <button className="ghost-button danger" disabled={busyId===a._id} onClick={() => cancel(a._id)}><XCircle size={15}/> Cancel</button>}
          </div>
        </article>
      ))}
    </section>
  </div>;
}
