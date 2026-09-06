import { useCallback, useEffect, useState } from "react";
import { CalendarDays, CheckCircle2, Clock3, Edit3, PhoneCall, Stethoscope, UserCog, Users, XCircle } from "lucide-react";
import api from "../services/api";

const statusLabel = {
  WAITING: "Awaiting consultation",
  CALLED: "Called",
  SERVING: "In consultation",
  COMPLETED: "Consultations completed",
  SKIPPED: "Skipped",
  NO_SHOW: "No-show",
  CHECKED_IN: "Checked-in patients",
  CONFIRMED: "Confirmed",
  CANCELLED: "Cancelled",
};

export default function DoctorDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileForm, setProfileForm] = useState({ name: "", designation: "", specialization: "", licenseNumber: "", experienceYears: 0, consultationFee: 0 });

  const loadDashboard = useCallback(async () => {
    try {
      const res = await api.get("/doctor/dashboard");
      setData(res.data);
      setError("");
    } catch (err) {
      setError(err.response?.data?.message || "Could not load the doctor dashboard.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
    const timer = setInterval(loadDashboard, 5000);
    return () => clearInterval(timer);
  }, [loadDashboard]);

  const doctor = data?.doctor;

  useEffect(() => {
    if (doctor) {
      setProfileForm({
        name: doctor.user?.name || "",
        designation: doctor.designation || "Consultant",
        specialization: doctor.specialization || "",
        licenseNumber: doctor.licenseNumber || "",
        experienceYears: doctor.experienceYears || 0,
        consultationFee: doctor.consultationFee || 0,
      });
    }
  }, [doctor]);

  const saveProfile = async (e) => {
    e.preventDefault();
    try {
      setProfileSaving(true);
      setError("");
      await api.patch("/doctors/me/profile", profileForm);
      setNotice("Your work profile was updated successfully.");
      setEditingProfile(false);
      await loadDashboard();
    } catch (err) {
      setError(err.response?.data?.message || "Could not update your profile.");
    } finally {
      setProfileSaving(false);
    }
  };

  const action = async (key, method, url, successMessage) => {
    try {
      setBusy(key);
      setNotice("");
      await api[method](url);
      setNotice(successMessage);
      await loadDashboard();
    } catch (err) {
      setError(err.response?.data?.message || "Action failed.");
    } finally {
      setBusy("");
    }
  };

  const updateAppointment = async (id, status) => {
    try {
      setBusy(`appointment-${id}`);
      await api.patch(`/doctor/dashboard/appointments/${id}/status`, { status });
      setNotice(`Appointment marked ${statusLabel[status].toLowerCase()}.`);
      await loadDashboard();
    } catch (err) {
      setError(err.response?.data?.message || "Could not update appointment.");
    } finally {
      setBusy("");
    }
  };

  if (loading) return <div className="manager-dashboard"><section className="panel loading-panel">Loading your department...</section></div>;
  if (error && !data) return <div className="manager-dashboard"><div className="error-box page-error">{error}</div></div>;

  const stats = data?.stats || {};
  const queue = data?.queue || [];
  const appointments = data?.appointments || [];
  const current = data?.current;

  return (
    <div className="manager-dashboard">
      <header className="page-header dashboard-welcome">
        <div>
          <span className="eyebrow"><Stethoscope size={13} /> Doctor Portal</span>
          <h1>Good morning, {doctor?.user?.name || "Doctor"}</h1>
          <p>{doctor?.department?.name || "Department"} · {doctor?.specialization || "General Medicine"}</p>
        </div>
        <div className="status-badge">{doctor?.status || "ACTIVE"}</div>
      </header>

      {error && <div className="error-box page-error">{error}</div>}
      {notice && <div className="success-box page-error">{notice}</div>}

      <section className="doctor-stat-grid">
        <article className="doctor-stat-card appointments">
          <div className="doctor-stat-icon"><CalendarDays size={18} /></div>
          <div className="doctor-stat-content"><span>Scheduled consultations</span><strong>{stats.appointments || 0}</strong><small>Scheduled for today</small></div>
        </article>
        <article className="doctor-stat-card waiting">
          <div className="doctor-stat-icon"><Users size={18} /></div>
          <div className="doctor-stat-content"><span>Awaiting consultation</span><strong>{stats.waiting || 0}</strong><small>Currently in queue</small></div>
        </article>
        <article className="doctor-stat-card checked">
          <div className="doctor-stat-icon"><Clock3 size={18} /></div>
          <div className="doctor-stat-content"><span>Checked-in patients</span><strong>{stats.checkedIn || 0}</strong><small>Ready for consultation</small></div>
        </article>
        <article className="doctor-stat-card completed">
          <div className="doctor-stat-icon"><CheckCircle2 size={18} /></div>
          <div className="doctor-stat-content"><span>Consultations completed</span><strong>{stats.completed || 0}</strong><small>Consultations completed today</small></div>
        </article>
      </section>

      <section className="dashboard-grid" style={{ gridTemplateColumns: "minmax(0, 1.35fr) minmax(300px, .65fr)", marginTop: 18 }}>
        <div className="panel">
          <div className="panel-title-row">
            <div><span className="eyebrow"><Users size={13} /> Active patient queue</span><h2>{current ? `Token #${current.tokenNumber} is ${statusLabel[current.status].toLowerCase()}` : "No patient currently being seen"}</h2></div>
            <button className="primary-button" disabled={busy === "next" || !!current} onClick={() => action("next", "post", "/doctor/dashboard/queue/next", "Next patient called.")}><PhoneCall size={16} /> {busy === "next" ? "Calling..." : "Call next"}</button>
          </div>

          {current ? (
            <div className="doctor-current-card">
              <div><span className="eyebrow">Patient in consultation</span><h3>{current.customer?.name || "Patient"}</h3><p className="muted">Token #{current.tokenNumber} · {current.service?.name || doctor?.department?.name}</p></div>
              <div className="button-row">
                {current.status === "CALLED" && <button className="secondary-button" disabled={busy === `start-${current._id}`} onClick={() => action(`start-${current._id}`, "patch", `/doctor/dashboard/queue/${current._id}/start`, "Consultation started.")}>{busy === `start-${current._id}` ? "Starting..." : "Start consultation"}</button>}
                {current.status === "SERVING" && <button className="primary-button" disabled={busy === `complete-${current._id}`} onClick={() => action(`complete-${current._id}`, "patch", `/doctor/dashboard/queue/${current._id}/complete`, "Consultation completed.")}><CheckCircle2 size={16} /> {busy === `complete-${current._id}` ? "Completing..." : "Complete"}</button>}
                {current.status === "CALLED" && <button className="danger-button" disabled={busy === `noshow-${current._id}`} onClick={() => action(`noshow-${current._id}`, "patch", `/doctor/dashboard/queue/${current._id}/no-show`, "Patient marked no-show.")}><XCircle size={16} /> No-show</button>}
              </div>
            </div>
          ) : <div className="empty-state">Call the next waiting patient when you are ready.</div>}

          <div className="table-wrap" style={{ marginTop: 16 }}>
            <table className="data-table">
              <thead><tr><th>Token</th><th>Patient</th><th>Status</th><th>Wait</th><th>Action</th></tr></thead>
              <tbody>
                {queue.filter((q) => q.status === "WAITING").map((entry) => (
                  <tr key={entry._id}><td><strong>#{entry.tokenNumber}</strong></td><td>{entry.customer?.name || "Patient"}</td><td><span className="status-badge">{statusLabel[entry.status]}</span></td><td>{entry.estimatedWaitTime || 0} min</td><td><button className="ghost-button" disabled={!!current || busy === `skip-${entry._id}`} onClick={() => action(`skip-${entry._id}`, "patch", `/doctor/dashboard/queue/${entry._id}/skip`, "Patient skipped.")}>Skip</button></td></tr>
                ))}
                {!queue.some((q) => q.status === "WAITING") && <tr><td colSpan="5" className="empty-cell">No patients awaiting consultation.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>

        <div className="panel">
          <div className="panel-title-row"><div><span className="eyebrow"><UserCog size={13} /> Your department</span><h2>{doctor?.department?.name}</h2></div><button className="ghost-button" onClick={() => setEditingProfile((v) => !v)}><Edit3 size={15} /> {editingProfile ? "Close" : "Edit profile"}</button></div>
          {!editingProfile ? (
            <>
              <div className="detail-list" style={{ marginTop: 16 }}>
                <div><span>Work designation</span><strong>{doctor?.designation || "Consultant"}</strong></div>
                <div><span>Code</span><strong>{doctor?.department?.code || "--"}</strong></div>
                <div><span>Specialization</span><strong>{doctor?.specialization || "--"}</strong></div>
                <div><span>Experience</span><strong>{doctor?.experienceYears || 0} years</strong></div>
                <div><span>License</span><strong>{doctor?.licenseNumber || "Not added"}</strong></div>
                <div><span>Consultation fee</span><strong>₹{Number(doctor?.consultationFee || 0).toLocaleString("en-IN")}</strong></div>
              </div>
              <div className="doctor-info-note">You can update your work designation and professional profile. Your hospital and department assignment are managed by Hospital Management.</div>
            </>
          ) : (
            <form onSubmit={saveProfile} style={{ marginTop: 16 }}>
              <div className="form-two">
                <label className="field"><span>Full name</span><input required value={profileForm.name} onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })} /></label>
                <label className="field"><span>Work designation</span><select value={profileForm.designation} onChange={(e) => setProfileForm({ ...profileForm, designation: e.target.value })}><option>Department Head</option><option>Senior Consultant</option><option>Consultant</option><option>Junior Consultant</option><option>Resident Doctor</option><option>Visiting Doctor</option></select></label>
              </div>
              <div className="form-two">
                <label className="field"><span>Specialization</span><input value={profileForm.specialization} onChange={(e) => setProfileForm({ ...profileForm, specialization: e.target.value })} /></label>
                <label className="field"><span>License number</span><input value={profileForm.licenseNumber} onChange={(e) => setProfileForm({ ...profileForm, licenseNumber: e.target.value })} /></label>
              </div>
              <div className="form-two">
                <label className="field"><span>Experience (years)</span><input type="number" min="0" value={profileForm.experienceYears} onChange={(e) => setProfileForm({ ...profileForm, experienceYears: e.target.value })} /></label>
                <label className="field"><span>Consultation fee (₹)</span><input type="number" min="0" value={profileForm.consultationFee} onChange={(e) => setProfileForm({ ...profileForm, consultationFee: e.target.value })} /></label>
              </div>
              <div className="button-row"><button type="submit" className="primary-button" disabled={profileSaving}>{profileSaving ? "Saving..." : "Save changes"}</button><button type="button" className="ghost-button" onClick={() => setEditingProfile(false)}>Cancel</button></div>
            </form>
          )}
        </div>
      </section>

      <section className="panel" style={{ marginTop: 18 }}>
        <div className="panel-title-row"><div><span className="eyebrow"><CalendarDays size={13} /> Today's consultation schedule</span><h2>Appointments</h2></div></div>
        <div className="table-wrap" style={{ marginTop: 14 }}>
          <table className="data-table">
            <thead><tr><th>Time</th><th>Patient</th><th>Department</th><th>Status</th><th>Action</th></tr></thead>
            <tbody>
              {appointments.map((appointment) => (
                <tr key={appointment._id}><td><strong>{appointment.scheduledTime}</strong></td><td>{appointment.customer?.name || "Patient"}<small>{appointment.customer?.email}</small></td><td>{appointment.department?.name || doctor?.department?.name}</td><td><span className="status-badge">{statusLabel[appointment.status] || appointment.status}</span></td><td><div className="button-row">{["SCHEDULED"].includes(appointment.status) && <button className="ghost-button" disabled={busy === `appointment-${appointment._id}`} onClick={() => updateAppointment(appointment._id, "CONFIRMED")}>Confirm</button>}{["CONFIRMED", "SCHEDULED"].includes(appointment.status) && <button className="danger-button" disabled={busy === `appointment-${appointment._id}`} onClick={() => updateAppointment(appointment._id, "NO_SHOW")}>No-show</button>}</div></td></tr>
              ))}
              {!appointments.length && <tr><td colSpan="5" className="empty-cell">No appointments for today.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
