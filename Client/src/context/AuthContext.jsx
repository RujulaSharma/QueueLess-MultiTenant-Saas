import { createContext, useContext, useEffect, useState } from "react";
import api from "../services/api";
import { disconnectSocket } from "../services/socket";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    if (!localStorage.getItem("queueless_token")) return null;
    try {
      return JSON.parse(localStorage.getItem("queueless_user")) || null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(() => Boolean(localStorage.getItem("queueless_token")));

  useEffect(() => {
    const token = localStorage.getItem("queueless_token");
    if (!token) return;
    let current = true;
    api.get("/auth/me")
      .then(({ data }) => {
        if (current && token === localStorage.getItem("queueless_token") && data?.user) {
          setUser(data.user);
          localStorage.setItem("queueless_user", JSON.stringify(data.user));
        }
      })
      .catch(() => {
        if (current && !localStorage.getItem("queueless_token")) setUser(null);
      })
      .finally(() => { if (current) setCheckingSession(false); });
    return () => { current = false; };
  }, []);

  useEffect(() => {
    const expireSession = () => { disconnectSocket(); setUser(null); };
    window.addEventListener("queueless:session-expired", expireSession);
    return () => window.removeEventListener("queueless:session-expired", expireSession);
  }, []);

  const persistUser = (nextUser, token) => {
    setUser(nextUser);
    localStorage.setItem("queueless_user", JSON.stringify(nextUser));
    if (token) localStorage.setItem("queueless_token", token);
  };

  const login = async (payload) => {
    setLoading(true);
    try {
      const { data } = await api.post("/auth/login", payload);
      persistUser(data.user, data.token);
      return data;
    } finally {
      setLoading(false);
    }
  };

  const register = async (payload) => {
    setLoading(true);
    try {
      const { data } = await api.post("/auth/register", payload);
      persistUser(data.user, data.token);
      return data;
    } finally {
      setLoading(false);
    }
  };

  const updateUser = (nextUser) => persistUser(nextUser);

  const logout = () => {
    disconnectSocket();
    setUser(null);
    localStorage.removeItem("queueless_user");
    localStorage.removeItem("queueless_token");
    localStorage.removeItem("queueless_business_id");
    localStorage.removeItem("queueless_service_id");
  };

  return (
    <AuthContext.Provider value={{ user, loading, checkingSession, login, register, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
