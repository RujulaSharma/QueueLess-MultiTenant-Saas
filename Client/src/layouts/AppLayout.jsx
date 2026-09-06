import { NavLink, Outlet, useNavigate, Link } from "react-router-dom";
import {
  BarChart3,
  CalendarDays,
  LayoutDashboard,
  ListOrdered,
  LogOut,
  Settings,
  HeartPulse,
  UserRound,
  Plus,
  Building2,
  UserCog,
  Home,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";

export default function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const isAdmin = user?.role === "ADMIN";
  const isDoctor = user?.role === "DOCTOR" || user?.role === "STAFF";

  const links = isAdmin
    ? [
        { to: "/admin", label: "Hospital Dashboard", icon: LayoutDashboard },
        { to: "/admin/business", label: "Hospital Profile", icon: Building2 },
        { to: "/admin/departments", label: "Departments", icon: Building2 },
        { to: "/admin/doctors", label: "Doctors", icon: UserCog },
        { to: "/appointments", label: "Appointment Schedule", icon: CalendarDays },
        { to: "/queue", label: "Queue Monitor", icon: ListOrdered },
        { to: "/analytics", label: "Reports & Analytics", icon: BarChart3 },
      ]
    : isDoctor
    ? [
        { to: "/dashboard", label: "Clinical Dashboard", icon: LayoutDashboard },
        { to: "/appointments", label: "Appointments", icon: CalendarDays },
        { to: "/queue", label: "Patient Queue", icon: ListOrdered },
      ]
    : [
        { to: "/dashboard", label: "Patient Dashboard", icon: LayoutDashboard },
        { to: "/book", label: "Book Appointment", icon: Plus },
        { to: "/queue", label: "My Queue", icon: ListOrdered },
        { to: "/appointments", label: "My Appointments", icon: CalendarDays },
      ];

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark"><HeartPulse size={19} /></div>
          <span>QueueLess</span>
        </div>

        <div className="sidebar-context">
          {isAdmin ? <Building2 size={15} /> : isDoctor ? <UserCog size={15} /> : <UserRound size={15} />}
          <span>{isAdmin ? "Hospital Management" : isDoctor ? "Clinical Portal" : "Patient Portal"}</span>
        </div>

        <nav className="nav-list">
          <Link to="/" className="home-nav-link"><Home size={18} /><span>Home</span></Link>
          {links.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}
            >
              <Icon size={18} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Mobile account actions. The desktop sidebar keeps its existing
            Profile / Settings / Sign out controls below. */}
        <div className="mobile-account-actions">
          <NavLink
            to="/profile"
            className={({ isActive }) => `mobile-account-link ${isActive ? "active" : ""}`}
          >
            <UserRound size={16} />
            <span>Profile</span>
          </NavLink>

          <NavLink
            to="/settings"
            className={({ isActive }) => `mobile-account-link ${isActive ? "active" : ""}`}
          >
            <Settings size={16} />
            <span>Settings</span>
          </NavLink>

          <button
            type="button"
            className="mobile-account-link mobile-logout"
            onClick={() => { logout(); navigate("/"); }}
          >
            <LogOut size={16} />
            <span>Logout</span>
          </button>
        </div>

        <div className="sidebar-bottom">
          <div className="sidebar-links">
            <NavLink to="/profile" className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}>
              <UserRound size={18} /><span>Profile</span>
            </NavLink>
            <NavLink to="/settings" className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}>
              <Settings size={18} /><span>Settings</span>
            </NavLink>
          </div>

          <button className="user-card user-card-button" onClick={() => navigate("/profile")}>
            <div className="avatar">{user?.name?.charAt(0)?.toUpperCase() || "U"}</div>
            <div>
              <strong>{user?.name || "User"}</strong>
              <span>{isAdmin ? "HOSPITAL ADMIN" : isDoctor ? "DOCTOR" : "PATIENT"}</span>
            </div>
          </button>

          <button className="ghost-button full" onClick={() => { logout(); navigate("/"); }}>
            <LogOut size={17} /> Sign out
          </button>
        </div>
      </aside>

      <main className="main-content"><Outlet /></main>
    </div>
  );
}
