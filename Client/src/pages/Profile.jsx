import { useEffect, useState } from "react";
import { Building2, CheckCircle2, CreditCard, Mail, MapPin, Phone, ShieldCheck, Stethoscope, UserRound } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { getProfile, updateProfile } from "../services/profileApi";

const roleMeta = {
  CUSTOMER: { label: "Patient", eyebrow: "Patient account", description: "Manage your personal details and QueueLess account information." },
  DOCTOR: { label: "Doctor", eyebrow: "Clinical profile", description: "View your professional details and the hospital assignment managed by Hospital Management." },
  ADMIN: { label: "Hospital Administrator", eyebrow: "Hospital administrator", description: "Manage your account details and review the hospital connected to your administrator account." },
  STAFF: { label: "Hospital Staff", eyebrow: "Hospital staff account", description: "View your account details and the hospital connected to your staff account." },
};

export default function Profile() {
  const { user, updateUser } = useAuth();
  const role = user?.role || "CUSTOMER";
  const meta = roleMeta[role] || roleMeta.CUSTOMER;
  const [profile, setProfile] = useState({});
  const [name, setName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data } = await getProfile();
        if (!mounted) return;
        setProfile(data.profile || {});
        setName(data.user?.name || "");
        setEmail(data.user?.email || "");
      } catch (err) {
        if (mounted) setError(err.response?.data?.message || "Could not load profile");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true); setMessage(""); setError("");
    try {
      const { data } = await updateProfile({ name, email });
      updateUser(data.user);
      setMessage("Account details updated successfully.");
    } catch (err) {
      setError(err.response?.data?.message || "Could not update profile");
    } finally { setSaving(false); }
  };

  const isDoctor = role === "DOCTOR";
  const isHospitalAdmin = role === "ADMIN" || role === "STAFF";
  const hospital = profile.hospital || profile.doctor?.hospital;
  const doctor = profile.doctor;

  return (
    <div className="profile-page">
      <header className="page-header">
        <div>
          <span className="eyebrow">{meta.eyebrow}</span>
          <h1>{meta.label} profile</h1>
          <p>{meta.description}</p>
        </div>
      </header>

      {error && <div className="error-box profile-alert">{error}</div>}
      {loading ? <section className="panel profile-loading">Loading profile details...</section> : (
        <div className="profile-layout">
          <section className="panel profile-card">
            <div className="profile-hero">
              <div className="profile-avatar">{user?.name?.charAt(0)?.toUpperCase() || "U"}</div>
              <div>
                <h2>{user?.name || "User"}</h2>
                <span>{meta.label}</span>
              </div>
            </div>

            <div className="profile-facts">
              <div><Mail size={17}/><div><small>Email address</small><strong>{user?.email}</strong></div></div>
              <div><ShieldCheck size={17}/><div><small>Account status</small><strong>{user?.isActive === false ? "Inactive" : "Active"}</strong></div></div>
              <div><UserRound size={17}/><div><small>Account type</small><strong>{meta.label}</strong></div></div>
            </div>

            {isDoctor && doctor && (
              <div className="profile-section">
                <div className="profile-section-title"><Stethoscope size={18}/><div><h3>Professional information</h3><p>Your clinical details</p></div></div>
                <div className="profile-detail-grid">
                  <Detail label="Designation" value={doctor.designation} />
                  <Detail label="Specialization" value={doctor.specialization} />
                  <Detail label="Department" value={doctor.department?.name} />
                  <Detail label="License number" value={doctor.licenseNumber || "Not provided"} />
                  <Detail label="Experience" value={`${doctor.experienceYears || 0} years`} />
                  <Detail label="Consultation fee" value={`₹${doctor.consultationFee || 0}`} />
                </div>
              </div>
            )}

            {isHospitalAdmin && hospital && (
              <div className="profile-section">
                <div className="profile-section-title"><Building2 size={18}/><div><h3>Connected hospital</h3><p>Your administrator account is linked to this hospital</p></div></div>
                <div className="hospital-profile-summary">
                  <strong>{hospital.name}</strong>
                  <span>{hospital.category}</span>
                  {hospital.address && <div><MapPin size={15}/>{hospital.address}</div>}
                  {hospital.phone && <div><Phone size={15}/>{hospital.phone}</div>}
                  {hospital.email && <div><Mail size={15}/>{hospital.email}</div>}
                  <div className="profile-status"><CheckCircle2 size={15}/> {hospital.isActive ? "Hospital account active" : "Hospital account inactive"}</div>
                </div>
              </div>
            )}
          </section>

          <form className="panel profile-form" onSubmit={submit}>
            <div className="section-heading">
              <div className="empty-icon"><UserRound size={20}/></div>
              <div><h2>Personal account details</h2><p>Update the name and email used for your QueueLess account.</p></div>
            </div>
            {message && <div className="success-box">{message}</div>}
            <label className="field"><span>Full name</span><input required minLength="2" value={name} onChange={(e)=>setName(e.target.value)} /></label>
            <label className="field"><span>Email address</span><input required type="email" value={email} onChange={(e)=>setEmail(e.target.value)} /></label>
            <button className="button primary" disabled={saving}>{saving ? "Saving..." : "Save account details"}</button>

            {isDoctor && <div className="profile-form-note"><Stethoscope size={16}/><span>Professional details such as designation, department, license and consultation fee are managed from your clinical profile.</span></div>}
            {isHospitalAdmin && <div className="profile-form-note"><Building2 size={16}/><span>Hospital information is managed separately under <strong>Hospital Profile</strong>.</span></div>}
          </form>
        </div>
      )}
    </div>
  );
}

function Detail({ label, value }) {
  return <div className="profile-detail"><small>{label}</small><strong>{value || "Not provided"}</strong></div>;
}
