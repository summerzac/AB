"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { api } from "./api";

export interface ManufacturerProfile {
  id: string;
  companyName: string;
  description?: string | null;
  logoUrl?: string | null;
  country?: string | null;
  verified: boolean;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: "MANUFACTURER" | "BUYER";
  manufacturerProfile?: ManufacturerProfile | null;
}

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<AuthUser>;
  register: (data: {
    email: string;
    password: string;
    name: string;
    role: "MANUFACTURER" | "BUYER";
    companyName?: string;
  }) => Promise<AuthUser>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem("ab_token");
    if (!stored) {
      setLoading(false);
      return;
    }
    setToken(stored);
    api<{ user: AuthUser }>("/api/auth/me")
      .then((res) => setUser(res.user))
      .catch(() => {
        localStorage.removeItem("ab_token");
        setToken(null);
      })
      .finally(() => setLoading(false));
  }, []);

  async function login(email: string, password: string) {
    const res = await api<{ token: string; user: AuthUser }>("/api/auth/login", {
      method: "POST",
      body: { email, password },
      auth: false,
    });
    localStorage.setItem("ab_token", res.token);
    setToken(res.token);
    setUser(res.user);
    return res.user;
  }

  async function register(data: {
    email: string;
    password: string;
    name: string;
    role: "MANUFACTURER" | "BUYER";
    companyName?: string;
  }) {
    const res = await api<{ token: string; user: AuthUser }>("/api/auth/register", {
      method: "POST",
      body: data,
      auth: false,
    });
    localStorage.setItem("ab_token", res.token);
    setToken(res.token);
    setUser(res.user);
    return res.user;
  }

  function logout() {
    localStorage.removeItem("ab_token");
    setToken(null);
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
