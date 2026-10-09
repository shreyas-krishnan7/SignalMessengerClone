"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { api, getToken, saveToken } from "@/lib/api";
import type { User } from "@/lib/types";

interface AuthValue {
  user: User | null;
  loading: boolean;
  login: (token: string, user: User) => void;
  logout: () => Promise<void>;
  setUser: (user: User) => void;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // App khulte hi check karo ki saved token valid hai ya nahi (session persistence)
  useEffect(() => {
    if (!getToken()) {
      setLoading(false);
      return;
    }
    api<User>("/api/users/me")
      .then(setUser)
      .catch(() => saveToken(null))
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback((token: string, loggedInUser: User) => {
    saveToken(token);
    setUser(loggedInUser);
  }, []);

  const logout = useCallback(async () => {
    // Server pe session delete karo, fail ho jaye tab bhi local logout kar do
    await api("/api/auth/logout", { method: "POST" }).catch(() => null);
    saveToken(null);
    setUser(null);
  }, []);

  return <AuthContext.Provider value={{ user, loading, login, logout, setUser }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside AuthProvider");
  return value;
}
