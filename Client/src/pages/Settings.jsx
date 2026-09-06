import { useEffect, useState } from "react";
import { Bell, Moon, Settings as SettingsIcon, Zap } from "lucide-react";

const defaults = { queueAlerts: true, appointmentAlerts: true, compactMode: false };

export default function Settings() {
  const [settings, setSettings] = useState(() => {
    try { return { ...defaults, ...JSON.parse(localStorage.getItem("queueless_settings")) }; }
    catch { return defaults; }
  });

  useEffect(() => {
    localStorage.setItem("queueless_settings", JSON.stringify(settings));
  }, [settings]);

  const toggle = (key) => setSettings((s) => ({ ...s, [key]: !s[key] }));

  const Row = ({ icon: Icon, title, description, keyName }) => (
    <div className="settings-row">
      <div className="settings-icon"><Icon size={18}/></div>
      <div className="settings-copy"><strong>{title}</strong><span>{description}</span></div>
      <button type="button" className={`toggle ${settings[keyName] ? "on" : ""}`} onClick={() => toggle(keyName)} aria-label={`Toggle ${title}`}><span/></button>
    </div>
  );

  return (
    <div>
      <header className="page-header">
        <div><span className="eyebrow">Preferences</span><h1>Settings</h1><p>Control your QueueLess notifications and display preferences.</p></div>
      </header>

      <section className="panel settings-panel">
        <div className="section-heading"><div className="empty-icon"><SettingsIcon size={20}/></div><div><h2>Notifications & display</h2><p>These preferences are stored locally on this device.</p></div></div>
        <Row icon={Bell} title="Queue alerts" description="Get the UI ready for token and position notifications." keyName="queueAlerts"/>
        <Row icon={Zap} title="Appointment reminders" description="Keep upcoming appointment reminders enabled." keyName="appointmentAlerts"/>
        <Row icon={Moon} title="Compact mode" description="Use tighter spacing across operational lists." keyName="compactMode"/>
      </section>
    </div>
  );
}
