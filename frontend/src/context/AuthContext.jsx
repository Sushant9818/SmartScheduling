import { createContext, useContext, useEffect, useState } from "react";
import { login as loginAPI, logout as logoutAPI } from "../services/authAPI";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true); // ✅ helps prevent flicker

  useEffect(() => {
    // Next.js SSR safe
    if (typeof window === "undefined") return;

    try {
      const savedUser = localStorage.getItem("user");
      const savedToken = localStorage.getItem("token");
      if (savedUser && savedToken) setUser(JSON.parse(savedUser));
    } finally {
      setLoading(false);
    }
  }, []);

  const login = async (email, password) => {
    const res = await loginAPI({ email, password });

    if (typeof window !== "undefined") {
      localStorage.setItem("token", res.data.token);
      localStorage.setItem("user", JSON.stringify(res.data.user));
    }

    setUser(res.data.user);
    return res.data.user;
  };

  const logout = async () => {
    // clear server refresh cookie (don’t block logout if it fails)
    try {
      await logoutAPI();
    } catch {
      // ignore
    }

    if (typeof window !== "undefined") {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
    }

    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

