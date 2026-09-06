import { useEffect, useMemo, useState } from "react";
import { CalendarPlus, Clock3, MapPin, Sparkles, Building2, Stethoscope, UserRound } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { getHospitals, getDepartments, getDoctorsByDepartment, getDoctorAvailability, createAppointment } from "../services/queueApi";

const DEFAULT_SLOTS = ["09:00", "09:30", "10:00", "10:30", "11:00", "11:30", "12:00", "12:30", "14:00", "14:30", "15:00", "15:30", "16:00", "16:30", "17:00"];

export default function BookAppointment() {
  const navigate = useNavigate();
  const [hospitals, setHospitals] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [bookedTimes, setBookedTimes] = useState([]);
  const [hospitalId, setHospitalId] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [doctorId, setDoctorId] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [doctorLoading, setDoctorLoading] = useState(false);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    getHospitals()
      .then(({ data }) => { const list = data.businesses || []; setHospitals(list); if (list[0]) setHospitalId(list[0]._id); })
      .catch((err) => setError(err.response?.data?.message || "Could not load hospitals"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!hospitalId) { setDepartments([]); setDepartmentId(""); return; }
    setDepartmentId(""); setDoctorId(""); setDoctors([]); setBookedTimes([]); setTime("");
    getDepartments(hospitalId)
      .then(({ data }) => setDepartments(data.departments || []))
      .catch((err) => setError(err.response?.data?.message || "Could not load departments"));
  }, [hospitalId]);

  useEffect(() => {
    if (!departmentId) { setDoctors([]); setDoctorId(""); return; }
    setDoctorLoading(true); setDoctorId(""); setBookedTimes([]); setTime("");
    getDoctorsByDepartment(departmentId)
      .then(({ data }) => setDoctors(data.doctors || []))
      .catch((err) => setError(err.response?.data?.message || "Could not load doctors"))
      .finally(() => setDoctorLoading(false));
  }, [departmentId]);

  useEffect(() => {
    if (!doctorId || !date) { setBookedTimes([]); return; }
    setAvailabilityLoading(true); setTime("");
    getDoctorAvailability(doctorId, date)
      .then(({ data }) => setBookedTimes(data.bookedTimes || []))
      .catch((err) => setError(err.response?.data?.message || "Could not load doctor availability"))
      .finally(() => setAvailabilityLoading(false));
  }, [doctorId, date]);

  const selectedHospital = hospitals.find((h) => h._id === hospitalId);
  const selectedDepartment = departments.find((d) => d._id === departmentId);
  const selectedDoctor = doctors.find((d) => d._id === doctorId);
  const availableSlots = useMemo(() => DEFAULT_SLOTS.filter((slot) => !bookedTimes.includes(slot)), [bookedTimes]);

  const submit = async (e) => {
    e.preventDefault(); setError("");
    if (!hospitalId || !departmentId || !doctorId || !date || !time) { setError("Choose a hospital, department, doctor, date, and available time."); return; }
    setSaving(true);
    try {
      await createAppointment({ hospitalId, departmentId, doctorId, appointmentDate: date, scheduledTime: time, notes });
      localStorage.setItem("queueless_business_id", hospitalId);
      localStorage.setItem("queueless_service_id", selectedDepartment?.legacyService || departmentId);
      navigate("/appointments", { state: { created: true } });
    } catch (err) { setError(err.response?.data?.message || "Could not create appointment"); }
    finally { setSaving(false); }
  };

  return <div>
    <header className="page-header"><div><span className="eyebrow">Patient scheduling</span><h1>Book an appointment</h1><p>Choose your hospital, department, doctor, and an available consultation time.</p></div></header>
    {error && <div className="error-box page-error">{error}</div>}
    <div className="booking-layout">
      <form className="panel booking-form" onSubmit={submit}>
        <div className="section-heading"><div className="empty-icon"><CalendarPlus size={21}/></div><div><h2>Choose your visit</h2><p>Your appointment is linked directly to the selected doctor.</p></div></div>
        <label className="field"><span>Hospital</span><select value={hospitalId} onChange={(e)=>setHospitalId(e.target.value)} disabled={loading}><option value="">Select a hospital</option>{hospitals.map(h=><option key={h._id} value={h._id}>{h.name}</option>)}</select></label>
        <label className="field"><span>Department</span><select value={departmentId} onChange={(e)=>setDepartmentId(e.target.value)} disabled={!hospitalId}><option value="">Select a department</option>{departments.map(d=><option key={d._id} value={d._id}>{d.name}</option>)}</select></label>
        <label className="field"><span>Doctor</span><select value={doctorId} onChange={(e)=>setDoctorId(e.target.value)} disabled={!departmentId || doctorLoading}><option value="">{doctorLoading ? "Loading doctors..." : "Select a doctor"}</option>{doctors.map(d=><option key={d._id} value={d._id}>{d.user?.name || "Doctor"} · {d.designation || "Consultant"}</option>)}</select></label>
        {departmentId && !doctorLoading && doctors.length === 0 && <div className="smart-note"><Stethoscope size={16}/><span>No active doctor is currently assigned to this department. Please choose another department.</span></div>}
        <div className="form-two">
          <label className="field"><span>Date</span><input type="date" min={new Date().toISOString().slice(0,10)} value={date} onChange={(e)=>setDate(e.target.value)} /></label>
          <label className="field"><span>Available time</span><select value={time} onChange={(e)=>setTime(e.target.value)} disabled={!doctorId || !date || availabilityLoading}><option value="">{availabilityLoading ? "Checking slots..." : "Select a time"}</option>{availableSlots.map(slot=><option key={slot} value={slot}>{slot}</option>)}</select></label>
        </div>
        {doctorId && date && !availabilityLoading && <div className="smart-note"><Clock3 size={16}/><span>{availableSlots.length} consultation slot{availableSlots.length===1?"":"s"} available for this doctor on {new Date(`${date}T00:00:00`).toLocaleDateString()}.</span></div>}
        <label className="field"><span>Notes <small>Optional</small></span><textarea rows="4" value={notes} onChange={(e)=>setNotes(e.target.value)} placeholder="Anything the doctor should know before your visit?"/></label>
        <button className="button primary full" disabled={saving || !doctorId || !time}>{saving ? "Booking..." : "Confirm appointment"}</button>
      </form>
      <aside className="panel booking-summary">
        <span className="eyebrow"><Building2 size={13}/> Visit preview</span>
        <h2>{selectedHospital?.name || "Select a hospital"}</h2><p>{selectedHospital?.description || "Your hospital, department, and doctor details will appear here."}</p>
        {selectedHospital?.address && <div className="detail-row"><MapPin size={16}/><span>{selectedHospital.address}</span></div>}
        {selectedDepartment && <div className="detail-row"><Building2 size={16}/><span>{selectedDepartment.name} · about {selectedDepartment.averageDuration} minutes</span></div>}
        {selectedDoctor && <div className="detail-row"><UserRound size={16}/><span><strong>{selectedDoctor.user?.name}</strong> · {selectedDoctor.designation || "Consultant"}{selectedDoctor.specialization ? ` · ${selectedDoctor.specialization}` : ""}</span></div>}
        <div className="smart-note"><Sparkles size={17}/><span>Appointments are tied to the doctor you select, so the doctor dashboard sees the right patient queue.</span></div>
      </aside>
    </div>
  </div>;
}
