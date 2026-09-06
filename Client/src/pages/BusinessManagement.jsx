import { useEffect, useState } from "react";
import {
  Building2, CheckCircle2, Edit3, Mail, MapPin, Phone, RefreshCw, Save
} from "lucide-react";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";

const defaultHours = {
  monday: "09:00-18:00",
  tuesday: "09:00-18:00",
  wednesday: "09:00-18:00",
  thursday: "09:00-18:00",
  friday: "09:00-18:00",
  saturday: "09:00-14:00",
  sunday: "Closed",
};

const emptyForm = {
  name: "",
  category: "Hospital",
  description: "",
  address: "",
  phone: "",
  email: "",
  openingHours: defaultHours,
};

const labels = {
  monday: "Monday",
  tuesday: "Tuesday",
  wednesday: "Wednesday",
  thursday: "Thursday",
  friday: "Friday",
  saturday: "Saturday",
  sunday: "Sunday",
};

export default function BusinessManagement() {
  const { user, updateUser } = useAuth();
  const [business, setBusiness] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const load = async () => {
    try {
      setLoading(true);
      setError("");
      const { data } = await api.get("/admin/business");
      const item = data?.business || null;
      setBusiness(item);
      if (item) {
        setForm({
          name: item.name || "",
          category: item.category || "Hospital",
          description: item.description || "",
          address: item.address || "",
          phone: item.phone || "",
          email: item.email || "",
          openingHours: { ...defaultHours, ...(item.openingHours || {}) },
        });
      }
    } catch (err) {
      setError(err?.response?.data?.message || "Could not load hospital profile.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const change = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
    setSuccess("");
  };

  const changeHour = (day, value) => {
    setForm((current) => ({
      ...current,
      openingHours: { ...current.openingHours, [day]: value },
    }));
  };

  const submit = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const response = business
        ? await api.patch(`/admin/business/${business._id}`, form)
        : await api.post("/admin/business", form);

      if (response.data?.business) {
        setBusiness(response.data.business);
        setForm({
          name: response.data.business.name || "",
          category: response.data.business.category || "Hospital",
          description: response.data.business.description || "",
          address: response.data.business.address || "",
          phone: response.data.business.phone || "",
          email: response.data.business.email || "",
          openingHours: { ...defaultHours, ...(response.data.business.openingHours || {}) },
        });
      }

      if (response.data?.user) {
        updateUser(response.data.user);
      } else if (user && response.data?.business?._id) {
        updateUser({ ...user, businessId: response.data.business._id, role: "ADMIN" });
      }

      setSuccess(business ? "Hospital profile updated successfully." : "Hospital created and connected to your admin account.");
    } catch (err) {
      setError(err?.response?.data?.message || "Could not save hospital profile.");
    } finally {
      setSaving(false);
    }
  };

  const toggle = async () => {
    if (!business) return;
    try {
      setError("");
      const { data } = await api.patch(`/admin/business/${business._id}/toggle`);
      setBusiness(data.business);
      setSuccess(data.message);
    } catch (err) {
      setError(err?.response?.data?.message || "Could not update hospital status.");
    }
  };

  if (loading) {
    return <section className="panel loading-panel">Loading hospital setup...</section>;
  }

  return (
    <div className="manager-dashboard">
      <header className="page-header dashboard-welcome">
        <div>
          <span className="eyebrow"><Building2 size={13} /> Admin setup</span>
          <h1>{business ? "Hospital Profile" : "Hospital profile"}</h1>
          <p>
            {business
              ? "Manage the hospital identity and contact details connected to this admin account."
              : "Create the hospital profile first. It will be automatically connected to your ADMIN account."}
          </p>
        </div>
        <div className="dashboard-header-actions">
          {business && (
            <span className={`status-badge ${business.isActive ? "" : "inactive"}`}>
              {business.isActive ? "ACTIVE" : "INACTIVE"}
            </span>
          )}
          <button className="button secondary" onClick={load}>
            <RefreshCw size={15} /> Refresh
          </button>
        </div>
      </header>

      {error && <div className="error-box page-error">{error}</div>}
      {success && <div className="success-box page-error"><CheckCircle2 size={16} /> {success}</div>}

      <form className="panel business-form" onSubmit={submit}>
        <div className="panel-title-row">
          <div>
            <span className="eyebrow">{business ? "Business profile" : "Hospital setup"}</span>
            <h2>{business ? "Edit hospital details" : "Create hospital profile"}</h2>
          </div>
          {business && <Edit3 size={19} />}
        </div>

        <div className="form-two">
          <label className="field">
            <span>Hospital name</span>
            <input required value={form.name} onChange={(e) => change("name", e.target.value)} placeholder="AIMA Hospital" />
          </label>
          <label className="field">
            <span>Category</span>
            <input value={form.category} onChange={(e) => change("category", e.target.value)} placeholder="Hospital" />
          </label>
        </div>

        <label className="field">
          <span>Description</span>
          <textarea rows="3" value={form.description} onChange={(e) => change("description", e.target.value)} placeholder="Multi-specialty hospital and diagnostic center" />
        </label>

        <label className="field">
          <span><MapPin size={14} /> Address</span>
          <textarea rows="2" value={form.address} onChange={(e) => change("address", e.target.value)} placeholder="Hospital address" />
        </label>

        <div className="form-two">
          <label className="field">
            <span><Phone size={14} /> Phone</span>
            <input value={form.phone} onChange={(e) => change("phone", e.target.value)} placeholder="+91 98765 43210" />
          </label>
          <label className="field">
            <span><Mail size={14} /> Email</span>
            <input type="email" value={form.email} onChange={(e) => change("email", e.target.value)} placeholder="admin@hospital.com" />
          </label>
        </div>

        <div className="panel-title-row" style={{ marginTop: 10 }}>
          <div><span className="eyebrow">Operations</span><h2>Opening hours</h2></div>
        </div>

        <div className="hours-grid">
          {Object.entries(labels).map(([day, label]) => (
            <label className="field" key={day}>
              <span>{label}</span>
              <input value={form.openingHours?.[day] || ""} onChange={(e) => changeHour(day, e.target.value)} placeholder="09:00-18:00" />
            </label>
          ))}
        </div>

        <div className="dashboard-header-actions" style={{ justifyContent: "flex-start", marginTop: 18 }}>
          <button className="button primary" disabled={saving}>
            <Save size={16} /> {saving ? "Saving..." : business ? "Save hospital changes" : "Create & connect hospital"}
          </button>
          {business && (
            <button type="button" className="button secondary" onClick={toggle}>
              {business.isActive ? "Deactivate hospital" : "Activate hospital"}
            </button>
          )}
        </div>
      </form>

      {business && (
        <section className="dashboard-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))" }}>
          <div className="panel">
            <span className="eyebrow">Connected account</span>
            <h2>Admin connection</h2>
            <div className="detail-list">
              <div><span>Admin</span><strong>{user?.name || "Admin"}</strong></div>
              <div><span>Role</span><strong>ADMIN</strong></div>
              <div><span>Hospital ID</span><strong>{business._id}</strong></div>
              <div><span>Status</span><strong>{business.isActive ? "Connected & active" : "Inactive"}</strong></div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
