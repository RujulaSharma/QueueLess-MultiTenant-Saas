import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, CalendarCheck2, CheckCircle2, Clock3, HeartPulse, Hospital, ListChecks, Menu, PlayCircle, Radio, ShieldCheck, Stethoscope, UsersRound, UserRound, LogOut, X } from "lucide-react";
import { useState } from "react";
import { useAuth } from "../context/AuthContext";

const features = [
  { icon: CalendarCheck2, title: "Easy appointments", text: "Choose a department, doctor and convenient time without phone calls or paperwork." },
  { icon: Radio, title: "Live queue tracking", text: "Know your token, current queue position and estimated waiting time in real time." },
  { icon: Clock3, title: "Less waiting", text: "Arrive closer to your turn instead of spending your day in a crowded waiting room." },
  { icon: ShieldCheck, title: "Secure records", text: "Keep appointment and consultation information organized with role-based access." },
];
const steps = [
  ["01", "Choose your care", "Find the hospital department and doctor that match what you need."],
  ["02", "Book your slot", "Pick a date and available time, then confirm your appointment in seconds."],
  ["03", "Check in", "Get your queue token when you arrive and follow your place from your phone."],
  ["04", "Get seen", "The doctor calls the next patient, completes the consultation and closes the visit."],
];
const specialties = ["Dental", "Blood Test", "BP Check", "X-Ray", "General Medicine", "Diagnostics"];

export default function Landing() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const dashboardPath = user?.role === "ADMIN" ? "/admin" : "/dashboard";
  const closeMobile = () => setMobileOpen(false);
  const handleLogout = () => {
    logout();
    closeMobile();
    navigate("/");
  };

  return (
    <div className="public-home">
      <header className="public-nav">
        <div className="public-nav-inner">
          <Link to="/" className="public-brand" onClick={closeMobile}>
            <span className="public-brand-mark"><HeartPulse size={21} /></span><span><b>Queue</b>Less</span>
          </Link>
          <nav className={`public-nav-links ${mobileOpen ? "open" : ""}`}>
            <a href="#home" onClick={closeMobile}>Home</a>
            <a href="#how-it-works" onClick={closeMobile}>How it works</a>
            <a href="#services" onClick={closeMobile}>Services</a>
            <a href="#why-queueless" onClick={closeMobile}>Why QueueLess</a>
            <a href="#contact" onClick={closeMobile}>Contact</a>

            {/* Auth actions are also available inside the mobile menu. */}
            <div className="mobile-home-auth">
              {user ? (
                <>
                  <Link to="/profile" onClick={closeMobile}>
                    <UserRound size={16} /> Profile
                  </Link>
                  <Link to={dashboardPath} onClick={closeMobile}>
                    Dashboard
                  </Link>
                  <button type="button" onClick={handleLogout}>
                    <LogOut size={16} /> Logout
                  </button>
                </>
              ) : (
                <>
                  <Link to="/login" onClick={closeMobile}>Login</Link>
                  <Link to="/register" onClick={closeMobile}>Register</Link>
                </>
              )}
            </div>
          </nav>

          <div className="public-nav-actions">
            {user ? (
              <>
                <Link className="public-login public-profile-link" to="/profile">
                  <UserRound size={15} /> Profile
                </Link>
                <button className="public-login public-logout-link" type="button" onClick={handleLogout}>
                  <LogOut size={15} /> Logout
                </button>
              </>
            ) : (
              <>
                <Link className="public-login" to="/login">Login</Link>
                <Link className="public-register" to="/register">Register</Link>
              </>
            )}
            <button className="mobile-menu" aria-label="Toggle navigation" onClick={() => setMobileOpen(v => !v)}>
              {mobileOpen ? <X size={21} /> : <Menu size={21} />}
            </button>
          </div>
        </div>
      </header>

      <main>
        <section className="public-hero" id="home">
          <div className="public-hero-inner">
            <div className="hero-copy">
              <div className="public-eyebrow"><span className="pulse-dot" /> Smarter healthcare visits</div>
              <h1>Healthcare that<br /><span>moves with you.</span></h1>
              <p className="hero-lead">QueueLess connects patients, doctors and hospitals in one simple system. Book appointments, check in, follow the live queue and get seen without the guesswork.</p>
              <div className="public-hero-actions">
                <Link className="public-cta hero-button" to={user ? "/book" : "/register"}>{user ? "Book an appointment" : "Start with QueueLess"}<ArrowRight size={18} /></Link>
                <a className="public-secondary-button" href="#how-it-works"><PlayCircle size={18} /> See how it works</a>
              </div>
              <div className="trust-row">
                <div className="trust-item"><ShieldCheck size={18} /><span>Secure access</span></div>
                <div className="trust-item"><Radio size={18} /><span>Live queue updates</span></div>
                <div className="trust-item"><HeartPulse size={18} /><span>Patient-first design</span></div>
              </div>
            </div>

            <div className="hero-visual" aria-label="QueueLess appointment and live queue preview">
              <div className="hero-glow" />
              <div className="doctor-card-float"><div className="mini-avatar"><Stethoscope size={18} /></div><div><strong>Doctor available</strong><span>Blood Test · Today</span></div><span className="available-dot">Available</span></div>
              <div className="phone-mockup">
                <div className="phone-notch" /><div className="phone-top"><span>QueueLess</span><span>9:42</span></div>
                <div className="phone-greeting">Good morning 👋</div><h3>Your next visit</h3>
                <div className="phone-appointment"><div className="phone-doctor-icon"><Stethoscope size={18} /></div><div><strong>Dr. Rohan Verma</strong><span>Blood Test</span></div><CheckCircle2 size={17} /></div>
                <div className="phone-time"><CalendarCheck2 size={16} /><span>Today, 12:30 PM</span></div>
                <div className="queue-preview"><div className="queue-preview-top"><span>Live queue</span><b>Token #1</b></div><div className="queue-progress"><i /></div><div className="queue-preview-bottom"><span>Your turn is next</span><strong>~5 min</strong></div></div>
                <button className="phone-button">View queue</button>
              </div>
              <div className="queue-float-card">
                <div className="queue-float-head"><span><Radio size={14} /> Live now</span><b>3 patients</b></div>
                <div className="queue-person active"><span className="token">#1</span><div><strong>Being seen</strong><small>Dr. Rohan</small></div><span className="status-live">Now</span></div>
                <div className="queue-person"><span className="token">#2</span><div><strong>Waiting</strong><small>Next patient</small></div><span className="status-wait">8 min</span></div>
                <div className="queue-person"><span className="token">#3</span><div><strong>Waiting</strong><small>Following</small></div><span className="status-wait">15 min</span></div>
              </div>
            </div>
          </div>
        </section>

        <section className="public-service-strip" id="services"><div className="service-strip-inner">
          <div><Hospital size={22} /><strong>Hospital management</strong><span>Departments, doctors & operations</span></div>
          <div><CalendarCheck2 size={22} /><strong>Appointments</strong><span>Simple scheduling for patients</span></div>
          <div><Radio size={22} /><strong>Live queues</strong><span>Real-time position & wait time</span></div>
          <div><ListChecks size={22} /><strong>Digital workflow</strong><span>From check-in to completion</span></div>
        </div></section>

        <section className="public-section" id="how-it-works"><div className="section-intro"><div><span className="public-kicker">HOW IT WORKS</span><h2>From appointment to consultation, without the waiting-room fog.</h2></div><p>One connected workflow keeps everyone on the same page.</p></div>
          <div className="steps-grid">{steps.map(([number,title,text]) => <article className="step-card" key={number}><span className="step-number">{number}</span><h3>{title}</h3><p>{text}</p></article>)}</div>
        </section>

        <section className="public-section specialties-section"><div className="section-intro compact"><div><span className="public-kicker">CARE, ORGANIZED</span><h2>One place for every department.</h2></div><p>QueueLess adapts to the way a modern hospital actually works.</p></div>
          <div className="specialty-grid">{specialties.map((name,index) => <div className="specialty-card" key={name}><span>{String(index+1).padStart(2,"0")}</span><strong>{name}</strong><ArrowRight size={16} /></div>)}</div>
        </section>

        <section className="public-section why-section" id="why-queueless"><div className="section-intro"><div><span className="public-kicker">WHY QUEUELESS</span><h2>Built around the people who actually use the hospital.</h2></div><p>Patients need clarity. Doctors need focus. Hospital teams need visibility. QueueLess gives each role the right view.</p></div>
          <div className="feature-grid-public">{features.map(({icon:Icon,title,text}) => <article className="feature-public-card" key={title}><div className="public-feature-icon"><Icon size={20} /></div><h3>{title}</h3><p>{text}</p></article>)}</div>
        </section>

        <section className="role-banner"><div className="role-banner-copy"><span className="public-kicker">ONE PLATFORM, THREE VIEWS</span><h2>Everyone sees what matters to them.</h2><p>Patients follow their visit. Doctors run their department queue. Hospital admins see the whole operation.</p></div><div className="role-cards"><div><UsersRound size={19} /><strong>Patient</strong><span>Book · Check in · Track</span></div><div><Stethoscope size={19} /><strong>Doctor</strong><span>Queue · Consult · Complete</span></div><div><Hospital size={19} /><strong>Admin</strong><span>Manage · Analyze · Improve</span></div></div></section>

        <section className="public-final-cta" id="contact"><div><span className="public-kicker">READY WHEN YOU ARE</span><h2>Make the next hospital visit feel simpler.</h2><p>Start with a patient account, or sign in to your existing QueueLess workspace.</p></div><div className="final-cta-actions"><Link className="public-cta hero-button" to={user ? "/book" : "/register"}>{user ? "Book appointment" : "Create account"}<ArrowRight size={18} /></Link><Link className="public-secondary-button" to={user ? dashboardPath : "/login"}>{user ? "Open dashboard" : "Sign in"}</Link></div></section>
      </main>

      <footer className="public-footer"><div className="public-footer-main"><Link to="/" className="public-brand"><span className="public-brand-mark"><HeartPulse size={19} /></span><span><b>Queue</b>Less</span></Link><p>Appointments and live queues, brought into one calm digital workflow.</p><div className="footer-links"><a href="#home">Home</a><a href="#how-it-works">How it works</a><a href="#services">Services</a><Link to="/login">Login</Link><Link to="/register">Register</Link></div></div><div className="public-footer-bottom"><span>© {new Date().getFullYear()} QueueLess</span><span>Healthcare queue management platform</span></div></footer>
    </div>
  );
}
