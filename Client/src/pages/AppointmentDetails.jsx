import { useEffect, useState } from "react";
import { ArrowLeft, CalendarDays, CheckCircle2, Clock3, FileText, MapPin, Radio, Stethoscope, UserRound } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import api from "../services/api";

const label = (value = "") => value.replaceAll("_", " ");
const statusClass = (status) => `status-badge status-${status?.toLowerCase()}`;

export default function AppointmentDetails() {
  const { id } = useParams();
  const [appointment, setAppointment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const { data } = await api.get(`/appointments/${id}`);
        if (active) setAppointment(data.appointment);
        if (active) setError("");
      } catch (err) {
        if (active) setError(err.response?.data?.message || "Could not load appointment details.");
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    const timer = setInterval(load, 10000);
    return () => { active = false; clearInterval(timer); };
  }, [id]);

  if (loading) return <section className="panel loading-panel">Loading appointment details...</section>;
  if (error || !appointment) return <div><Link className="back-link" to="/appointments"><ArrowLeft size={15}/> Back to appointments</Link><div className="error-box page-error">{error || "Appointment not found."}</div></div>;

  const queue = appointment.queueEntry;
  const doctorName = appointment.doctor?.user?.name;
  const fee = Number(appointment.service?.price ?? appointment.department?.consultationFee ?? 0);

  return (
    <div className="appointment-detail-page">
      <Link className="back-link" to="/appointments"><ArrowLeft size={15}/> Back to appointments</Link>
      <header className="page-header">
        <div>
          <span className="eyebrow">Appointment details</span>
          <h1>{appointment.department?.name || appointment.service?.name || "Hospital visit"}</h1>
          <p>Everything connected to this visit, from booking through consultation.</p>
        </div>
        <span className={statusClass(appointment.status)}>{label(appointment.status)}</span>
      </header>

      <section className="detail-hero panel">
        <div className="detail-hero-main">
          <div className="appointment-icon"><CalendarDays size={21}/></div>
          <div><span className="eyebrow">Scheduled visit</span><h2>{new Date(appointment.appointmentDate).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</h2><p><Clock3 size={14}/> {appointment.scheduledTime}</p></div>
        </div>
        {queue && <div className="detail-token"><Radio size={16}/><span>Token</span><strong>#{queue.tokenNumber}</strong></div>}
      </section>

      <div className="dashboard-grid detail-grid">
        <section className="panel">
          <div className="panel-title-row"><div><span className="eyebrow">Visit information</span><h2>Appointment</h2></div></div>
          <div className="detail-list detail-list-large">
            <div><span>Hospital</span><strong>{appointment.business?.name || "Hospital"}</strong></div>
            <div><span>Department</span><strong>{appointment.department?.name || "Department"}</strong></div>
            <div><span>Doctor</span><strong>{doctorName || "Doctor"}</strong></div>
            <div><span>Designation</span><strong>{appointment.doctor?.designation || "Consultant"}</strong></div>
            <div><span>Specialization</span><strong>{appointment.doctor?.specialization || "General Medicine"}</strong></div>
            <div><span>Appointment fee</span><strong>₹{fee.toLocaleString("en-IN")}</strong></div>
            <div><span>Patient</span><strong>{appointment.customer?.name || "Patient"}</strong></div>
          </div>
        </section>

        <section className="panel">
          <div className="panel-title-row"><div><span className="eyebrow">Hospital</span><h2>Where to go</h2></div></div>
          <div className="location-card">
            <BuildingIcon />
            <div><strong>{appointment.business?.name || "Hospital"}</strong><span><MapPin size={13}/> {appointment.business?.address || "Address not provided"}</span>{appointment.business?.phone && <span>{appointment.business.phone}</span>}</div>
          </div>
          <div className="detail-timeline">
            <div className={appointment.createdAt ? "done" : ""}><CheckCircle2 size={15}/><span>Booked</span></div>
            <div className={appointment.checkedInAt ? "done" : ""}><Radio size={15}/><span>Checked in</span></div>
            <div className={appointment.consultationStartedAt ? "done" : ""}><Stethoscope size={15}/><span>Consultation</span></div>
            <div className={appointment.completedAt ? "done" : ""}><CheckCircle2 size={15}/><span>Completed</span></div>
          </div>
        </section>
      </div>

      {(appointment.notes || appointment.diagnosis || appointment.consultationNotes || appointment.prescription) && (
        <section className="panel consultation-summary">
          <div className="panel-title-row"><div><span className="eyebrow"><FileText size={13}/> Clinical record</span><h2>Consultation summary</h2></div></div>
          <div className="clinical-grid">
            {appointment.notes && <ClinicalField title="Patient notes" value={appointment.notes}/>} 
            {appointment.diagnosis && <ClinicalField title="Diagnosis" value={appointment.diagnosis}/>} 
            {appointment.consultationNotes && <ClinicalField title="Doctor's notes" value={appointment.consultationNotes}/>} 
            {appointment.prescription && <ClinicalField title="Prescription / advice" value={appointment.prescription}/>} 
          </div>
          {!appointment.diagnosis && !appointment.consultationNotes && !appointment.prescription && <p className="muted">Clinical notes will appear here after the doctor completes the consultation.</p>}
        </section>
      )}
    </div>
  );
}

function ClinicalField({ title, value }) {
  return <div className="clinical-field"><span>{title}</span><p>{value}</p></div>;
}

function BuildingIcon() {
  return <div className="location-icon"><UserRound size={18}/></div>;
}
