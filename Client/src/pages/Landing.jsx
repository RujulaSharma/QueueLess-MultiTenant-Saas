import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  CalendarCheck2,
  CheckCircle2,
  Clock3,
  HeartPulse,
  Hospital,
  ListChecks,
  Menu,
  Play,
  Radio,
  ShieldCheck,
  Stethoscope,
  UsersRound,
  UserRound,
  LogOut,
  X,
  Bell,
  MapPin,
  Sparkles,
  ChevronRight,
} from "lucide-react";
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
      {/* Floating Header Navigation matching Reference Design */}
      <header className="public-nav">
        <div className="public-nav-inner">
          <Link to="/" className="public-brand" onClick={closeMobile}>
            <span className="public-brand-mark"><HeartPulse size={20} /></span>
            <span className="brand-title"><b>Queue</b>Less</span>
          </Link>

          <nav className={`public-nav-links ${mobileOpen ? "open" : ""}`}>
            <a href="#home" className="active-nav-link" onClick={closeMobile}>Home</a>
            <a href="#how-it-works" onClick={closeMobile}>How it works</a>
            <a href="#services" onClick={closeMobile}>Services</a>
            <a href="#why-queueless" onClick={closeMobile}>Why QueueLess</a>
            <a href="#pricing" onClick={closeMobile}>Pricing</a>
            <a href="#contact" onClick={closeMobile}>Contact</a>

            {/* Mobile auth links */}
            <div className="mobile-home-auth">
              {user ? (
                <>
                  <Link to="/profile" onClick={closeMobile}>
                    <UserRound size={16} /> Profile ({user.name?.split(" ")[0]})
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
                <Link className="public-profile-btn" to="/profile">
                  <UserRound size={16} />
                  <span>Profile</span>
                </Link>
                <Link className="public-cta-nav" to={dashboardPath}>
                  <span>Dashboard</span>
                  <ArrowRight size={15} />
                </Link>
              </>
            ) : (
              <>
                <Link className="public-profile-btn" to="/login">
                  <UserRound size={16} />
                  <span>Profile</span>
                </Link>
                <Link className="public-cta-nav" to="/book">
                  <span>Book an appointment</span>
                  <ArrowRight size={15} />
                </Link>
              </>
            )}
            <button className="mobile-menu" aria-label="Toggle navigation" onClick={() => setMobileOpen(v => !v)}>
              {mobileOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>
      </header>

      <main>
        {/* Hero Section matching Reference Design */}
        <section className="public-hero" id="home">
          <div className="hero-bg-leaves" />
          <div className="public-hero-inner">
            <div className="hero-copy">
              <div className="public-eyebrow">
                <span className="pulse-dot" />
                SMARTER HEALTHCARE VISITS
              </div>
              <h1 className="hero-title">
                Healthcare that<br />
                <span className="hero-highlight">moves with you.</span>
              </h1>
              <p className="hero-lead">
                QueueLess connects patients, doctors and hospitals in one simple system. Book appointments, check in, follow the live queue and get seen without the guesswork.
              </p>

              <div className="public-hero-actions">
                <Link className="public-cta hero-button" to={user ? "/book" : "/register"}>
                  <span>Book an appointment</span>
                  <ArrowRight size={18} />
                </Link>
                <a className="public-secondary-button" href="#how-it-works">
                  <span className="play-icon-circle"><Play size={14} fill="currentColor" /></span>
                  <span>See how it works</span>
                </a>
              </div>

              <div className="trust-row">
                <div className="trust-item"><ShieldCheck size={17} /><span>Secure access</span></div>
                <div className="trust-item"><Radio size={17} /><span>Live queue updates</span></div>
                <div className="trust-item"><HeartPulse size={17} /><span>Patient-first design</span></div>
              </div>
            </div>

            {/* Interactive Hero Preview Graphic matching Reference */}
            <div className="hero-visual" aria-label="QueueLess appointment and live queue preview">
              <div className="hero-soft-backdrop" />

              {/* Floating Doctor Available Card (Top Right) */}
              <div className="doctor-card-float">
                <div className="mini-avatar"><UserRound size={18} /></div>
                <div className="doctor-float-info">
                  <strong>Doctor available</strong>
                  <span>Blood Test · Today</span>
                </div>
                <span className="available-pill">Available</span>
              </div>

              {/* Phone Mockup Frame */}
              <div className="phone-mockup">
                <div className="phone-notch" />
                <div className="phone-header">
                  <span className="phone-brand">Queue<b>Less</b></span>
                  <span className="phone-bell"><Bell size={15} /></span>
                </div>

                <div className="phone-greeting">Good morning, {user?.name?.split(" ")[0] || "Rujula"} 👋</div>
                <h3 className="phone-section-title">Your next visit</h3>

                {/* Visit Card inside phone */}
                <div className="phone-appointment-card">
                  <div className="phone-doctor-row">
                    <div className="phone-doctor-icon"><Stethoscope size={18} /></div>
                    <div className="phone-doctor-details">
                      <strong>Dr. Rohan Verma</strong>
                      <span>Blood Test • General Medicine</span>
                    </div>
                    <div className="phone-doc-arrow"><ArrowRight size={15} /></div>
                  </div>
                  <div className="phone-meta-row">
                    <span className="phone-meta-item"><CalendarCheck2 size={14} /> Today, 12:30 PM</span>
                    <span className="phone-meta-item"><MapPin size={14} /> City Care Hospital</span>
                  </div>
                </div>

                {/* Live Queue Box inside phone */}
                <div className="phone-queue-box">
                  <div className="phone-queue-head">
                    <span className="live-dot-label"><span className="green-dot" /> Live queue</span>
                    <span className="ahead-label">3 patients ahead</span>
                  </div>

                  <div className="phone-queue-list">
                    <div className="phone-queue-item active">
                      <span className="queue-idx">#1</span>
                      <div className="queue-item-info">
                        <strong>Being seen</strong>
                        <span>Dr. Rohan</span>
                      </div>
                      <span className="queue-time-badge now">Now</span>
                    </div>
                    <div className="phone-queue-item">
                      <span className="queue-idx">#2</span>
                      <div className="queue-item-info">
                        <strong>Waiting</strong>
                        <span>Next patient</span>
                      </div>
                      <span className="queue-time-badge">8 min</span>
                    </div>
                    <div className="phone-queue-item">
                      <span className="queue-idx">#3</span>
                      <div className="queue-item-info">
                        <strong>Waiting</strong>
                        <span>Following</span>
                      </div>
                      <span className="queue-time-badge">15 min</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Deep Forest Green "Your Token" Floating Card (Bottom Right) */}
              <div className="token-float-card">
                <div className="token-card-header">Your Token</div>
                <div className="token-card-number">A-104</div>
                <div className="token-progress-bar">
                  <div className="token-progress-fill" />
                </div>
                <div className="token-card-footer">
                  <span>3 patients ahead</span>
                  <span>~ 18 minutes</span>
                </div>
                <div className="token-curved-note">
                  <span className="curved-arrow">↳</span>
                  <em>Live queue updates in real time</em>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 4 Feature Cards Strip matching reference */}
        <section className="public-service-strip" id="services">
          <div className="service-strip-inner">
            <Link to="/admin" className="service-feature-card">
              <div className="service-card-icon hospital-icon"><Hospital size={22} /></div>
              <div className="service-card-text">
                <strong>Hospital management</strong>
                <span>Departments, doctors & operations</span>
              </div>
              <div className="service-card-arrow"><ArrowRight size={16} /></div>
            </Link>

            <Link to="/appointments" className="service-feature-card">
              <div className="service-card-icon appointment-icon"><CalendarCheck2 size={22} /></div>
              <div className="service-card-text">
                <strong>Appointments</strong>
                <span>Simple scheduling for patients</span>
              </div>
              <div className="service-card-arrow"><ArrowRight size={16} /></div>
            </Link>

            <Link to="/queue" className="service-feature-card">
              <div className="service-card-icon queue-icon"><Radio size={22} /></div>
              <div className="service-card-text">
                <strong>Live queues</strong>
                <span>Real-time position & wait time</span>
              </div>
              <div className="service-card-arrow"><ArrowRight size={16} /></div>
            </Link>

            <Link to="/dashboard" className="service-feature-card">
              <div className="service-card-icon workflow-icon"><ListChecks size={22} /></div>
              <div className="service-card-text">
                <strong>Digital workflow</strong>
                <span>From check-in to completion</span>
              </div>
              <div className="service-card-arrow"><ArrowRight size={16} /></div>
            </Link>
          </div>
        </section>

        {/* How It Works Section */}
        <section className="public-section" id="how-it-works">
          <div className="section-intro">
            <div>
              <span className="public-kicker">HOW IT WORKS</span>
              <h2>From appointment to consultation, without the waiting-room fog.</h2>
            </div>
            <p>One connected workflow keeps patients, doctors, and staff on the same page.</p>
          </div>
          <div className="steps-grid">
            {steps.map(([number, title, text]) => (
              <article className="step-card" key={number}>
                <span className="step-number">{number}</span>
                <h3>{title}</h3>
                <p>{text}</p>
              </article>
            ))}
          </div>
        </section>

        {/* Care Specialties Section */}
        <section className="public-section specialties-section">
          <div className="section-intro compact">
            <div>
              <span className="public-kicker">CARE, ORGANIZED</span>
              <h2>One place for every department.</h2>
            </div>
            <p>QueueLess adapts to the way modern clinics and hospitals actually operate.</p>
          </div>
          <div className="specialty-grid">
            {specialties.map((name, index) => (
              <div className="specialty-card" key={name}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <strong>{name}</strong>
                <ArrowRight size={16} />
              </div>
            ))}
          </div>
        </section>

        {/* Why QueueLess Section */}
        <section className="public-section why-section" id="why-queueless">
          <div className="section-intro">
            <div>
              <span className="public-kicker">WHY QUEUELESS</span>
              <h2>Built around the people who actually use healthcare.</h2>
            </div>
            <p>Patients need clarity. Doctors need focus. Hospital teams need visibility. QueueLess gives each role the right view.</p>
          </div>
          <div className="feature-grid-public">
            {features.map(({ icon: Icon, title, text }) => (
              <article className="feature-public-card" key={title}>
                <div className="public-feature-icon"><Icon size={20} /></div>
                <h3>{title}</h3>
                <p>{text}</p>
              </article>
            ))}
          </div>
        </section>

        {/* Role Banner */}
        <section className="role-banner">
          <div className="role-banner-copy">
            <span className="public-kicker">ONE PLATFORM, THREE VIEWS</span>
            <h2>Everyone sees what matters to them.</h2>
            <p>Patients follow their visit. Doctors run their department queue. Hospital admins see the whole operation.</p>
          </div>
          <div className="role-cards">
            <div className="role-card-item">
              <UsersRound size={22} />
              <strong>Patient Portal</strong>
              <span>Book · Check in · Live Token Tracking</span>
            </div>
            <div className="role-card-item">
              <Stethoscope size={22} />
              <strong>Clinical Portal</strong>
              <span>Live Queue · Consult · Complete Visits</span>
            </div>
            <div className="role-card-item">
              <Hospital size={22} />
              <strong>Hospital Control</strong>
              <span>Manage · Analytics · Staff Operations</span>
            </div>
          </div>
        </section>

        {/* Pricing / Value Section */}
        <section className="public-section pricing-section" id="pricing">
          <div className="section-intro">
            <div>
              <span className="public-kicker">TRANSPARENT VALUE</span>
              <h2>Designed to scale with your healthcare facility.</h2>
            </div>
            <p>From single doctor practices to multi-department multi-tenant hospital networks.</p>
          </div>
          <div className="pricing-grid">
            <div className="pricing-card">
              <div className="pricing-tag">Standard Clinic</div>
              <div className="pricing-price">Free <span>/ for patients</span></div>
              <p>Direct patient appointment booking, real-time token tracking, and wait time alerts.</p>
              <ul className="pricing-features">
                <li><CheckCircle2 size={16} /> Instant token generation</li>
                <li><CheckCircle2 size={16} /> Real-time queue tracker</li>
                <li><CheckCircle2 size={16} /> Notification on turn</li>
              </ul>
              <Link to="/book" className="button secondary full">Book now</Link>
            </div>

            <div className="pricing-card featured">
              <div className="pricing-badge">Most Popular</div>
              <div className="pricing-tag">Hospital & Center</div>
              <div className="pricing-price">Professional <span>/ SaaS</span></div>
              <p>Full multi-tenant department management, doctor dashboards, analytics, and collaborative workspaces.</p>
              <ul className="pricing-features">
                <li><CheckCircle2 size={16} /> Multi-department queue routing</li>
                <li><CheckCircle2 size={16} /> Live doctor clinical portals</li>
                <li><CheckCircle2 size={16} /> Collaborative workspace & tasks</li>
                <li><CheckCircle2 size={16} /> Real-time Socket.IO synchronization</li>
              </ul>
              <Link to="/register" className="button primary full">Get Started</Link>
            </div>
          </div>
        </section>

        {/* Final CTA Section */}
        <section className="public-final-cta" id="contact">
          <div>
            <span className="public-kicker">READY WHEN YOU ARE</span>
            <h2>Make your next hospital visit feel simpler.</h2>
            <p>Start with a patient account, or sign in to your existing QueueLess workspace.</p>
          </div>
          <div className="final-cta-actions">
            <Link className="public-cta hero-button" to={user ? "/book" : "/register"}>
              <span>{user ? "Book appointment" : "Create account"}</span>
              <ArrowRight size={18} />
            </Link>
            <Link className="public-secondary-button" to={user ? dashboardPath : "/login"}>
              {user ? "Open dashboard" : "Sign in"}
            </Link>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="public-footer">
        <div className="public-footer-main">
          <Link to="/" className="public-brand">
            <span className="public-brand-mark"><HeartPulse size={19} /></span>
            <span><b>Queue</b>Less</span>
          </Link>
          <p>Appointments and live queues, brought into one calm digital workflow.</p>
          <div className="footer-links">
            <a href="#home">Home</a>
            <a href="#how-it-works">How it works</a>
            <a href="#services">Services</a>
            <a href="#pricing">Pricing</a>
            <Link to="/login">Login</Link>
            <Link to="/register">Register</Link>
          </div>
        </div>
        <div className="public-footer-bottom">
          <span>© {new Date().getFullYear()} QueueLess SaaS</span>
          <span>Healthcare queue management platform</span>
        </div>
      </footer>
    </div>
  );
}
