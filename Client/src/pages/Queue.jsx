import { useEffect, useState } from "react";
import { Clock3, Radio, Ticket, Users, XCircle, Play, CheckCircle2, SkipForward } from "lucide-react";
import api from "../services/api";
import { getMyQueue, cancelQueue } from "../services/queueApi";
import { getBusinessQueue, callNext, startServing, completeService, skipQueue, markNoShow } from "../services/businessApi";
import { joinBusinessRoom } from "../services/socket";
import { useAuth } from "../context/AuthContext";

const activeStatuses = ["WAITING", "CALLED", "SERVING"];
const hospitalRoles = ["ADMIN", "STAFF"];

export default function Queue() {
  const { user } = useAuth();
  const isHospital = hospitalRoles.includes(user?.role);
  const isDoctor = user?.role === "DOCTOR";
  const [entries, setEntries] = useState([]);
  const [history, setHistory] = useState([]);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(null);

  const load = async () => {
    try {
      setError("");
      if (isDoctor) {
        const response = await api.get("/doctor/dashboard");
        setEntries(response.data.queue || []);
        setHistory([]);
      } else {
        const response = isHospital ? await getBusinessQueue(user.businessId) : await getMyQueue();
        setEntries(response.data.queue || []);
        setHistory(response.data.recentHistory || []);
      }
    } catch (err) { setError(err.response?.data?.message || "Could not load the active queue"); }
  };

  useEffect(() => {
    if (!user) return;
    load();
    const timer = setInterval(load, 3000);
    return () => clearInterval(timer);
  }, [user?.role, user?.businessId]);
  useEffect(() => {
    const businessIds = isHospital
      ? [user?.businessId].filter(Boolean).map(String)
      : [...new Set(entries.map((entry) => entry.business?._id || entry.business).filter(Boolean).map(String))];

    if (!businessIds.length) {
      setConnected(false);
      return undefined;
    }

    setConnected(true);
    const cleanups = businessIds.map((businessId) => joinBusinessRoom(businessId, load));
    return () => cleanups.forEach((cleanup) => cleanup());
  }, [isHospital, user?.businessId, entries.map((entry) => entry.business?._id || entry.business).filter(Boolean).join(",")]);

  const run = async (id, action) => {
    try { setBusy(id); setError(""); await action(); await load(); }
    catch (err) { setError(err.response?.data?.message || "Queue action failed"); }
    finally { setBusy(null); }
  };

  const active = isHospital ? null : entries.find((q) => activeStatuses.includes(q.status));

  if (isDoctor) {
    const current = entries.find((q) => ["CALLED", "SERVING"].includes(q.status));
    const waiting = entries.filter((q) => q.status === "WAITING");
    const runDoctor = async (key, method, url, message) => {
      try {
        setBusy(key); setError("");
        await api[method](url);
        await load();
      } catch (err) { setError(err.response?.data?.message || "Queue action failed"); }
      finally { setBusy(null); }
    };

    return <div>
      <header className="page-header"><div><span className="eyebrow">Doctor operations</span><h1>Active queue</h1><p>Manage patients currently waiting for consultation.</p></div><div className={`live-pill ${connected ? "online" : ""}`}><Radio size={14}/> {connected ? "Live" : "Standby"}</div></header>
      {error && <div className="error-box page-error">{error}</div>}
      <section className="panel queue-history business-live-board">
        <div className="section-heading"><div className="empty-icon"><Users size={20}/></div><div><h2>{current ? `Token #${current.tokenNumber} is ${current.status === "SERVING" ? "in consultation" : "called"}` : `${waiting.length} patients waiting`}</h2><p>Your queue is limited to your assigned department and doctor profile.</p></div></div>
        <div className="queue-controls" style={{ marginBottom: 18 }}>
          <button className="primary-button" disabled={!!current || busy === "next"} onClick={() => runDoctor("next", "post", "/doctor/dashboard/queue/next", "Next patient called.")}><Play size={15}/> {busy === "next" ? "Calling..." : "Call next"}</button>
        </div>
        {current && <div className="doctor-current-card" style={{ marginBottom: 18 }}>
          <div><span className="eyebrow">Current patient</span><h3>{current.customer?.name || "Patient"}</h3><p className="muted">Token #{current.tokenNumber} · {current.department?.name || current.service?.name || "Department"}</p></div>
          <div className="button-row">
            {current.status === "CALLED" && <button className="secondary-button" disabled={busy === `start-${current._id}`} onClick={() => runDoctor(`start-${current._id}`, "patch", `/doctor/dashboard/queue/${current._id}/start`, "Consultation started.")}>{busy === `start-${current._id}` ? "Starting..." : "Start consultation"}</button>}
            {current.status === "SERVING" && <button className="primary-button" disabled={busy === `complete-${current._id}`} onClick={() => runDoctor(`complete-${current._id}`, "patch", `/doctor/dashboard/queue/${current._id}/complete`, "Consultation completed.")}><CheckCircle2 size={15}/> {busy === `complete-${current._id}` ? "Completing..." : "Complete"}</button>}
            {current.status === "CALLED" && <button className="danger-button" disabled={busy === `noshow-${current._id}`} onClick={() => runDoctor(`noshow-${current._id}`, "patch", `/doctor/dashboard/queue/${current._id}/no-show`, "Patient marked no-show.")}><XCircle size={15}/> No-show</button>}
          </div>
        </div>}
        <div className="table-wrap"><table className="data-table"><thead><tr><th>Token</th><th>Patient</th><th>Status</th><th>Wait</th><th>Action</th></tr></thead><tbody>
          {waiting.map((entry) => <tr key={entry._id}><td><strong>#{entry.tokenNumber}</strong></td><td>{entry.customer?.name || "Patient"}</td><td><span className="status-badge">Waiting</span></td><td>{entry.estimatedWaitTime || 0} min</td><td><button className="ghost-button" disabled={!!current || busy === `skip-${entry._id}`} onClick={() => runDoctor(`skip-${entry._id}`, "patch", `/doctor/dashboard/queue/${entry._id}/skip`, "Patient skipped.")}><SkipForward size={14}/> Skip</button></td></tr>)}
          {!waiting.length && <tr><td colSpan="5" className="empty-cell">No patients are currently awaiting service.</td></tr>}
        </tbody></table></div>
      </section>
    </div>;
  }

  if (isHospital) return <div>
    <header className="page-header"><div><span className="eyebrow">Operations</span><h1>Active queue</h1><p>Hospital-wide view of patients currently awaiting or receiving service.</p></div><div className={`live-pill ${connected ? "online" : ""}`}><Radio size={14}/> {connected ? "Live" : "Standby"}</div></header>
    {error && <div className="error-box page-error">{error}</div>}
    <section className="panel queue-history business-live-board">
      <div className="section-heading"><div className="empty-icon"><Users size={20}/></div><div><h2>{entries.length} active patients in the hospital queues</h2><p>Monitor patients moving through each department queue.</p></div></div>
      {entries.length === 0 ? <div className="empty-inline"><CheckCircle2 size={18}/> The active queue is clear. Completed visits remain in recent activity below.</div> : entries.map((entry, index) => <div className="queue-row business-live-row" key={entry._id}>
        <strong>#{entry.tokenNumber}</strong><span><b>{entry.customer?.name || "Patient"}</b><small>{entry.department?.name || entry.service?.name || "Department"}{entry.doctor?.user?.name ? ` · Dr. ${entry.doctor.user.name}` : ""}</small></span><span>{entry.status}</span><span>{entry.status === "WAITING" ? `#${entry.position || index+1}` : entry.status === "SERVING" ? "Now" : "Called"}</span>
        <div className="queue-controls">
          {entry.status === "WAITING" && <button className="icon-action" title="Call next patient" disabled={busy===entry._id} onClick={() => run(entry._id, () => callNext(user.businessId, entry.department?._id || entry.service?._id || entry.service))}><Play size={15}/></button>}
          {entry.status === "CALLED" && <><button className="icon-action" title="Start patient" disabled={busy===entry._id} onClick={() => run(entry._id, () => startServing(entry._id))}><Play size={15}/></button><button className="icon-action" title="No show" disabled={busy===entry._id} onClick={() => run(entry._id, () => markNoShow(entry._id))}><XCircle size={15}/></button></>}
          {entry.status === "SERVING" && <button className="icon-action" title="Complete visit" disabled={busy===entry._id} onClick={() => run(entry._id, () => completeService(entry._id))}><CheckCircle2 size={15}/></button>}
          {entry.status === "WAITING" && <button className="icon-action" title="Skip" disabled={busy===entry._id} onClick={() => run(entry._id, () => skipQueue(entry._id))}><SkipForward size={15}/></button>}
        </div>
      </div>)}
      {history.length > 0 && <div className="queue-history" style={{ marginTop: 24 }}>
        <div className="section-heading"><div className="empty-icon"><Clock3 size={20}/></div><div><h2>Recent queue activity</h2><p>Completed and closed visits stay visible for hospital staff.</p></div></div>
        {history.map((entry) => <div className="queue-row business-live-row" key={`history-${entry._id}`}>
          <strong>#{entry.tokenNumber}</strong><span><b>{entry.customer?.name || "Patient"}</b><small>{entry.department?.name || entry.service?.name || "Department"}{entry.doctor?.user?.name ? ` · Dr. ${entry.doctor.user.name}` : ""}</small></span><span>{entry.status}</span><span>{entry.completedAt ? new Date(entry.completedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "Closed"}</span>
        </div>)}
      </div>}
    </section>
  </div>;

  return <div>
    <header className="page-header"><div><span className="eyebrow">Patient queue</span><h1>Active queue</h1><p>Track your position and estimated wait time in real time.</p></div><div className={`live-pill ${connected ? "online" : ""}`}><Radio size={14}/> {connected ? "Live" : "Standby"}</div></header>
    {error && <div className="error-box page-error">{error}</div>}
    {active ? <div className="queue-hero panel"><div className="queue-token"><Ticket size={22}/><span>Your token</span><strong>#{active.tokenNumber}</strong></div><div className="queue-doctor-line">{active.doctor?.user?.name ? `Dr. ${active.doctor.user.name}` : active.department?.name || "Department queue"}</div><div className="queue-metrics"><div><span>Position</span><strong>{active.status === "SERVING" ? "Now serving" : `#${active.position || "-"}`}</strong></div><div><span>Estimated wait</span><strong>{active.estimatedWaitTime || 0} min</strong></div><div><span>Status</span><strong>{active.status.replace("_", " ")}</strong></div></div><div className="queue-actions"><button className="ghost-button danger" onClick={() => run(active._id, () => cancelQueue(active._id))}><XCircle size={16}/> Leave queue</button></div></div> : <section className="panel empty-panel"><div className="empty-icon"><Users size={22}/></div><h2>You’re not in a active queue</h2><p>Book an appointment in a department, then check in when you arrive.</p></section>}
    <section className="panel queue-history"><div className="section-heading"><div className="empty-icon"><Clock3 size={20}/></div><div><h2>Recent queue entries</h2><p>Your queue history stays visible here across your hospital visits.</p></div></div>{entries.length === 0 ? <p className="muted">No queue history yet.</p> : entries.map((entry) => <div className="queue-row" key={entry._id}><strong>#{entry.tokenNumber}</strong><span><b>{entry.department?.name || entry.service?.name || "Department"}</b><small>{entry.doctor?.user?.name ? `Dr. ${entry.doctor.user.name}` : "Department queue"}</small></span><span>{entry.status.replace("_", " ")}</span><span>{entry.estimatedWaitTime || 0} min</span></div>)}</section>
  </div>;
}
