import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Sparkles } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const { login, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    try {
      await login(form);
      navigate(location.state?.from?.pathname || "/dashboard", { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || "Unable to sign in.");
    }
  };

  return (
    <AuthCard title="Welcome back" subtitle="Sign in to your QueueLess workspace.">
      <form onSubmit={submit} className="form">
        <label>Email<input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label>
        <label>Password<input type="password" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></label>
        {error && <div className="error-box">{error}</div>}
        <button className="button primary full" disabled={loading}>{loading ? "Signing in..." : "Sign in"}</button>
      </form>
      <p className="auth-switch">New to QueueLess? <Link to="/register">Create an account</Link></p>
    </AuthCard>
  );
}

function AuthCard({ title, subtitle, children }) {
  return (
    <div className="auth-page">
      <div className="auth-card">
        <Link to="/" className="auth-brand"><span className="brand-mark"><Sparkles size={17} /></span> QueueLess</Link>
        <h1>{title}</h1>
        <p>{subtitle}</p>
        {children}
      </div>
    </div>
  );
}
