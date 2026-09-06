import { useEffect, useState } from "react";
import { Building2, Plus, RefreshCw, UserCog } from "lucide-react";
import api from "../services/api";
import { createDepartment, toggleDepartment } from "../services/adminHospitalApi";

const emptyForm = { name: "", code: "", description: "", averageDuration: 15, consultationFee: 0 };

export default function Departments() {
  const [departments, setDepartments] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await api.get("/admin/departments");
      setDepartments(res.data?.departments || []);
    } catch (err) {
      setError(err.response?.data?.message || "Could not load departments.");
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
      await createDepartment(form);
      setForm(emptyForm);
      setShowForm(false);
      await load();
    } catch (err) {
      setError(err.response?.data?.message || "Could not create department.");
    } finally {
      setSaving(false);
    }
  };

  const toggle = async (id) => {
    try {
      await toggleDepartment(id);
      await load();
    } catch (err) {
      setError(err.response?.data?.message || "Could not update department.");
    }
  };

  return (
    <div className="manager-dashboard">
      <header className="page-header dashboard-welcome">
        <div>
          <span className="eyebrow"><Building2 size={13} /> AIMA Hospital</span>
          <h1>Departments</h1>
          <p>Manage the hospital departments and their doctor owners.</p>
        </div>
        <div className="dashboard-header-actions">
          <button className="button secondary" onClick={load}><RefreshCw size={15} /> Refresh</button>
          <button className="button primary" onClick={() => setShowForm((v) => !v)}><Plus size={16} /> Add department</button>
        </div>
      </header>

      {error && <div className="error-box page-error">{error}</div>}

      {showForm && (
        <form className="panel" onSubmit={submit} style={{ marginBottom: 18 }}>
          <div className="panel-title-row"><div><span className="eyebrow">Hospital setup</span><h2>New department</h2></div></div>
          <div className="form-two">
            <label className="field"><span>Name</span><input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Dental" /></label>
            <label className="field"><span>Code</span><input required value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="DENT" /></label>
          </div>
          <div className="form-two">
            <label className="field"><span>Average duration (minutes)</span><input type="number" min="1" value={form.averageDuration} onChange={(e) => setForm({ ...form, averageDuration: e.target.value })} /></label>
            <label className="field"><span>Consultation fee (₹)</span><input type="number" min="0" value={form.consultationFee} onChange={(e) => setForm({ ...form, consultationFee: e.target.value })} /></label>
          </div>
          <label className="field"><span>Description</span><textarea rows="3" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="What this department handles" /></label>
          <button className="button primary" disabled={saving}>{saving ? "Creating..." : "Create department"}</button>
        </form>
      )}

      {loading ? <section className="panel loading-panel">Loading departments...</section> : (
        <section className="dashboard-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))" }}>
          {departments.map((d) => (
            <article className="panel" key={d._id}>
              <div className="panel-title-row">
                <div>
                  <span className="eyebrow">{d.code}</span>
                  <h2>{d.name}</h2>
                </div>
                <span className="status-badge">{d.isActive ? "ACTIVE" : "INACTIVE"}</span>
              </div>
              <p className="muted">{d.description || "No description added."}</p>
              <div className="detail-list" style={{ marginTop: 16 }}>
                <div><span>Doctor owner</span><strong><UserCog size={14} /> {d.ownerDoctor?.user?.name || "Not assigned"}</strong></div>
                <div><span>Appointments</span><strong>{d.appointmentCount || 0}</strong></div>
                <div><span>Active queue</span><strong>{d.queueCount || 0}</strong></div>
                <div><span>Fee</span><strong>₹{Number(d.consultationFee || 0).toLocaleString("en-IN")}</strong></div>
              </div>
              <button className="button secondary" style={{ marginTop: 16 }} onClick={() => toggle(d._id)}>{d.isActive ? "Deactivate" : "Activate"}</button>
            </article>
          ))}
          {!departments.length && <section className="panel"><h2>No departments yet</h2><p className="muted">Create your first hospital department, then assign a doctor from the Doctors section.</p></section>}
        </section>
      )}
    </div>
  );
}
