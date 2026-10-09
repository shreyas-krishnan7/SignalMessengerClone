"use client";

import { createContext, useContext, useEffect, useState } from "react";

export type Theme = "system" | "light" | "dark";

interface SettingsValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  notifications: boolean;
  setNotifications: (enabled: boolean) => void;
  typingIndicators: boolean;
  setTypingIndicators: (enabled: boolean) => void;
}

const SettingsContext = createContext<SettingsValue | null>(null);

// useState jaisa hi, bas value localStorage mein bhi save hoti hai (refresh ke baad bhi yaad rahe)
function useStoredState<T>(key: string, initialValue: T) {
  const [value, setValue] = useState<T>(initialValue);

  useEffect(() => {
    const saved = localStorage.getItem(key);
    if (saved !== null) setValue(JSON.parse(saved));
  }, [key]);

  function update(newValue: T) {
    setValue(newValue);
    localStorage.setItem(key, JSON.stringify(newValue));
  }

  return [value, update] as const;
}

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useStoredState<Theme>("signal_theme", "system");
  const [notifications, setNotifications] = useStoredState("signal_notifications", true);
  const [typingIndicators, setTypingIndicators] = useStoredState("signal_typing_indicators", true);

  // Theme badalne pe <html> pe "dark" class lagao/hatao
  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    function applyTheme() {
      const dark = theme === "dark" || (theme === "system" && media.matches);
      document.documentElement.classList.toggle("dark", dark);
    }
    applyTheme();
    // "System" mode mein OS ka theme badle to app bhi badle
    media.addEventListener("change", applyTheme);
    return () => media.removeEventListener("change", applyTheme);
  }, [theme]);

  return (
    <SettingsContext.Provider
      value={{ theme, setTheme, notifications, setNotifications, typingIndicators, setTypingIndicators }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const value = useContext(SettingsContext);
  if (!value) throw new Error("useSettings must be used inside SettingsProvider");
  return value;
}
