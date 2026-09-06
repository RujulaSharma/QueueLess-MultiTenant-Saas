import { useEffect, useMemo, useState } from "react";
import { Activity, BarChart3, CheckCircle2, Clock3, Users, XCircle, ArrowUpRight } from "lucide-react";
import { getBusinessAnalytics } from "../services/businessApi";

const format = (value) => (value === null || value === undefined ? "—" : value);
const statusLabel = (value) => String(value || "").replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());

export default function Analytics() {
  const [analytics, setAnalytics] = useState(null);
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    setError("");
    getBusinessAnalytics(days)
      .then(({ data }) => setAnalytics(data.analytics))
      .catch((err) => setError(err.response?.data?.message || "Unable to load hospital analytics."))
      .finally(() => setLoading(false));
  }, [days]);

  const departments = analytics?.departmentPerformance || analytics?.servicePerformance || [];
  const volume = analytics?.dailyVolume || [];
  const maxVolume = useMemo(() => Math.max(...volume.map((day) => day.customers || 0), 1), [volume]);

  return (
    <div className="analytics-page">
      <header className="page-header analytics-header">
        <div>
          <span className="eyebrow"><BarChart3 size={13} /> Hospital reports</span>
          <h1>Reports &amp; Analytics</h1>
          <p>Track patient flow, waiting times, consultation performance, and department demand.</p>
        </div>
        <label className="analytics-period">
          <span>Reporting period</span>
          <select className="analytics-select" value={days} onChange={(e) => setDays(Number(e.target.value))}>
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>
        </label>
      </header>

      {error && <div className="error-box page-error">{error}</div>}

      {loading ? (
        <section className="panel loading-panel">Preparing your hospital report...</section>
      ) : (
        <>
          <section className="analytics-kpis">
            <div className="analytics-kpi">
              <div className="analytics-kpi-icon"><CheckCircle2 size={18} /></div>
              <div><span>Completed consultations</span><strong>{format(analytics?.completed)}</strong><small>Successfully completed visits</small></div>
            </div>
            <div className="analytics-kpi">
              <div className="analytics-kpi-icon"><Clock3 size={18} /></div>
              <div><span>Average waiting time</span><strong>{format(analytics?.averageWaitMinutes)}{analytics?.averageWaitMinutes !== null && analytics?.averageWaitMinutes !== undefined ? " min" : ""}</strong><small>Check-in to patient call</small></div>
            </div>
            <div className="analytics-kpi">
              <div className="analytics-kpi-icon"><Activity size={18} /></div>
              <div><span>Average consultation time</span><strong>{format(analytics?.averageServiceMinutes)}{analytics?.averageServiceMinutes !== null && analytics?.averageServiceMinutes !== undefined ? " min" : ""}</strong><small>Based on completed consultations</small></div>
            </div>
            <div className="analytics-kpi">
              <div className="analytics-kpi-icon danger-icon"><XCircle size={18} /></div>
              <div><span>Cancelled</span><strong>{analytics?.noShowRate || 0}%</strong><small>{analytics?.noShows || 0} missed appointments</small></div>
            </div>
          </section>

          <section className="analytics-main-grid">
            <section className="panel analytics-panel analytics-departments">
              <div className="panel-title-row">
                <div><span className="eyebrow">Department performance</span><h2>Patient demand by department</h2></div>
              </div>
              {departments.length ? (
                <div className="department-analytics-list">
                  {departments.map((department) => {
                    const percent = Math.min(((department.total || 0) / maxVolume) * 100, 100);
                    return (
                      <div className="department-analytics-row" key={department.departmentId || department.serviceId}>
                        <div className="department-analytics-main">
                          <div className="department-analytics-icon"><Users size={16} /></div>
                          <div><strong>{department.departmentName || department.serviceName}</strong><span>{department.completed || 0} completed · {department.noShows || 0} no-shows</span></div>
                        </div>
                        <div className="department-analytics-bar"><div><i style={{ width: `${percent}%` }} /></div><span>{department.total || 0} visits</span></div>
                        <div className="department-analytics-result"><strong>{department.averageServiceMinutes ?? "—"}{department.averageServiceMinutes !== null && department.averageServiceMinutes !== undefined ? "m" : ""}</strong><span>avg. consultation</span></div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="analytics-empty"><Users size={22} /><div><strong>No department activity yet</strong><span>Department performance will appear after appointments are checked in and completed.</span></div></div>
              )}
            </section>

            <section className="panel analytics-panel analytics-volume">
              <div className="panel-title-row"><div><span className="eyebrow">Patient flow</span><h2>Daily visit volume</h2></div></div>
              {volume.length ? (
                <div className="analytics-chart">
                  {volume.slice(-14).map((day) => {
                    const value = day.customers || 0;
                    return (
                      <div className="analytics-chart-column" key={day.date} title={`${value} visits`}>
                        <strong>{value}</strong>
                        <div className="analytics-chart-track"><i style={{ height: `${Math.max((value / maxVolume) * 100, value ? 10 : 3)}%` }} /></div>
                        <span>{new Date(`${day.date}T12:00:00`).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}</span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="analytics-empty compact"><BarChart3 size={22} /><div><strong>No daily volume yet</strong><span>Visit volume will appear here as patients use the system.</span></div></div>
              )}
            </section>
          </section>

          <section className="analytics-summary-strip">
            <div><span>Total queue entries</span><strong>{analytics?.totalCustomers || 0}</strong></div>
            <div><span>Completed consultations</span><strong>{analytics?.completed || 0}</strong></div>
            <div><span>No-shows</span><strong>{analytics?.noShows || 0}</strong></div>
            <div><span>Cancelled</span><strong>{analytics?.cancelled || 0}</strong></div>
            <div className="analytics-summary-note"><ArrowUpRight size={16} /><span>Use the reporting period above to compare recent hospital activity.</span></div>
          </section>
        </>
      )}
    </div>
  );
}
