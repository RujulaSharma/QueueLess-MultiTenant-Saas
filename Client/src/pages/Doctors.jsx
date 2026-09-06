import { useEffect, useState } from "react";
import { Edit3, Plus, RefreshCw, UserCog, X } from "lucide-react";
import api from "../services/api";
import { createDoctor, updateDoctor } from "../services/adminHospitalApi";

const emptyForm = { name: "", email: "", password: "", departmentId: "", designation: "Consultant", specialization: "", licenseNumber: "", experienceYears: 0, consultationFee: 0 };

export default function Doctors() {
  const [doctors, setDoctors] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(null);
  const [editForm, setEditForm] = useState({});

  const load = async () => {
    try {
      setLoading(true);
      setError("");
      const [doctorRes, departmentRes] = await Promise.all([
        api.get("/admin/doctors"),
        api.get("/admin/departments"),
      ]);
      setDoctors(doctorRes.data?.doctors || []);
      setDepartments(departmentRes.data?.departments || []);
    } catch (err) {
      setError(err.response?.data?.message || "Could not load doctors.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const submit = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      setError("");
      await createDoctor(form);
      setForm(emptyForm);
      setShowForm(false);
      await load();
    } catch (err) {
      setError(err.response?.data?.message || "Could not create doctor.");
    } finally {
      setSaving(false);
    }
  };


  const openEdit = (doctor) => {
    setError("");
    setEditing(doctor);
    setEditForm({
      name: doctor.user?.name || "",
      departmentId: doctor.department?._id || doctor.department || "",
      designation: doctor.designation || "Consultant",
      specialization: doctor.specialization || "General Medicine",
      licenseNumber: doctor.licenseNumber || "",
      experienceYears: doctor.experienceYears || 0,
      consultationFee: doctor.consultationFee || 0,
      status: doctor.status || "ACTIVE",
    });
  };

  const closeEdit = () => {
    setEditing(null);
    setEditForm({});
  };

  const saveEdit = async (e) => {
    e.preventDefault();
    if (!editing) return;
    try {
      setSaving(true);
      setError("");
      await updateDoctor(editing._id, editForm);
      closeEdit();
      await load();
    } catch (err) {
      setError(err.response?.data?.message || "Could not update doctor.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="manager-dashboard">
      <header className="page-header dashboard-welcome">
        <div>
          <span className="eyebrow"><UserCog size={13} /> AIMA Hospital</span>
          <h1>Doctors</h1>
          <p>Create and manage doctor login accounts, professional details, and department assignments.</p>
        </div>
        <div className="dashboard-header-actions">
          <button className="button secondary" onClick={load}><RefreshCw size={15} /> Refresh</button>
          <button className="button primary" onClick={() => setShowForm((v) => !v)}><Plus size={16} /> Add doctor</button>
        </div>
      </header>

      {error && <div className="error-box page-error">{error}</div>}

      {showForm && (
        <form className="panel" onSubmit={submit} style={{ marginBottom: 18 }}>
          <div className="panel-title-row"><div><span className="eyebrow">Hospital management</span><h2>Create doctor account</h2></div></div>
          <div className="form-two">
            <label className="field"><span>Doctor name</span><input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Dr. Sharma" /></label>
            <label className="field"><span>Email</span><input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="doctor@aima.demo" /></label>
          </div>
          <div className="form-two">
            <label className="field"><span>Temporary password</span><input required type="password" minLength="6" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></label>
            <label className="field"><span>Department assignment</span><select required value={form.departmentId} onChange={(e) => setForm({ ...form, departmentId: e.target.value })}><option value="">Select department</option>{departments.filter((d) => d.isActive && !d.ownerDoctor).map((d) => <option key={d._id} value={d._id}>{d.name}</option>)}</select></label>
          </div>
          <div className="form-two">
            <label className="field"><span>Work designation</span><select value={form.designation} onChange={(e) => setForm({ ...form, designation: e.target.value })}><option>Department Head</option><option>Senior Consultant</option><option>Consultant</option><option>Junior Consultant</option><option>Resident Doctor</option><option>Visiting Doctor</option></select></label>
            <label className="field"><span>Specialization</span><input value={form.specialization} onChange={(e) => setForm({ ...form, specialization: e.target.value })} placeholder="Cardiology" /></label>
            <label className="field"><span>License number</span><input value={form.licenseNumber} onChange={(e) => setForm({ ...form, licenseNumber: e.target.value })} placeholder="AIMA-CARD-001" /></label>
          </div>
          <div className="form-two">
            <label className="field"><span>Experience (years)</span><input type="number" min="0" value={form.experienceYears} onChange={(e) => setForm({ ...form, experienceYears: e.target.value })} /></label>
            <label className="field"><span>Consultation fee (₹)</span><input type="number" min="0" value={form.consultationFee} onChange={(e) => setForm({ ...form, consultationFee: e.target.value })} /></label>
          </div>
          <button className="button primary" disabled={saving}>{saving ? "Creating account..." : "Create doctor account"}</button>
        </form>
      )}

      {editing && (
        <form className="panel" onSubmit={saveEdit} style={{ marginBottom: 18, border: "1px solid #334155" }}>
          <div className="panel-title-row">
            <div><span className="eyebrow">Hospital management</span><h2>Edit doctor account</h2><p className="muted">{editing.user?.email}</p></div>
            <button type="button" className="button secondary" onClick={closeEdit}><X size={15} /> Close</button>
          </div>
          <div className="form-two">
            <label className="field"><span>Doctor name</span><input required value={editForm.name || ""} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} /></label>
            <label className="field"><span>Department</span><select required value={editForm.departmentId || ""} onChange={(e) => setEditForm({ ...editForm, departmentId: e.target.value })}>{departments.filter((d) => d.isActive && (!d.ownerDoctor || String(d.ownerDoctor?._id || d.ownerDoctor) === String(editing._id)) || String(d._id) === String(editForm.departmentId)).map((d) => <option key={d._id} value={d._id}>{d.name} ({d.code})</option>)}</select></label>
          </div>
          <div className="form-two">
            <label className="field"><span>Work designation</span><select value={editForm.designation || "Consultant"} onChange={(e) => setEditForm({ ...editForm, designation: e.target.value })}><option>Department Head</option><option>Senior Consultant</option><option>Consultant</option><option>Junior Consultant</option><option>Resident Doctor</option><option>Visiting Doctor</option></select></label>
            <label className="field"><span>Status</span><select value={editForm.status || "ACTIVE"} onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}><option value="ACTIVE">Active</option><option value="ON_LEAVE">On leave</option><option value="INACTIVE">Inactive</option></select></label>
          </div>
          <div className="form-two">
            <label className="field"><span>Specialization</span><input value={editForm.specialization || ""} onChange={(e) => setEditForm({ ...editForm, specialization: e.target.value })} /></label>
            <label className="field"><span>License number</span><input value={editForm.licenseNumber || ""} onChange={(e) => setEditForm({ ...editForm, licenseNumber: e.target.value })} /></label>
          </div>
          <div className="form-two">
            <label className="field"><span>Experience (years)</span><input type="number" min="0" value={editForm.experienceYears ?? 0} onChange={(e) => setEditForm({ ...editForm, experienceYears: e.target.value })} /></label>
            <label className="field"><span>Consultation fee (₹)</span><input type="number" min="0" value={editForm.consultationFee ?? 0} onChange={(e) => setEditForm({ ...editForm, consultationFee: e.target.value })} /></label>
          </div>
          <button className="button primary" disabled={saving}>{saving ? "Saving changes..." : "Save doctor changes"}</button>
        </form>
      )}

      {loading ? <section className="panel loading-panel">Loading doctors...</section> : (
        <section className="dashboard-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))" }}>
          {doctors.map((doctor) => (
            <article className="panel" key={doctor._id}>
              <div className="panel-title-row">
                <div><span className="eyebrow">{doctor.specialization}</span><h2>{doctor.user?.name || "Doctor"}</h2></div>
                <span className="status-badge">{doctor.status}</span>
              </div>
              <p className="muted">{doctor.user?.email}</p>
              <div className="detail-list" style={{ marginTop: 16 }}>
                <div><span>Work designation</span><strong>{doctor.designation || "Consultant"}</strong></div>
                <div><span>Department</span><strong>{doctor.department?.name || "Not assigned"}</strong></div>
                <div><span>Code</span><strong>{doctor.department?.code || "--"}</strong></div>
                <div><span>Experience</span><strong>{doctor.experienceYears || 0} years</strong></div>
                <div><span>License</span><strong>{doctor.licenseNumber || "Not added"}</strong></div>
              </div>
              <button className="button secondary" style={{ marginTop: 16 }} onClick={() => openEdit(doctor)}><Edit3 size={15} /> Edit doctor</button>
            </article>
          ))}
          {!doctors.length && <section className="panel"><h2>No doctors yet</h2><p className="muted">The Admin creates the doctor login and assigns the doctor to a department.</p></section>}
        </section>
      )}
    </div>
  );
}
