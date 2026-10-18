"use client";

import { Onboarding } from "@/components/onboarding/Onboarding";
import { SignalApp } from "@/components/SignalApp";
import { SignalLogo } from "@/components/ui/misc";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { ChatProvider } from "@/context/ChatContext";
import { SettingsProvider } from "@/context/SettingsContext";
import { ToastProvider } from "@/context/ToastContext";

export default function Home() {
  return (
    <SettingsProvider>
      <ToastProvider>
        <AuthProvider>
          <AuthGate />
        </AuthProvider>
      </ToastProvider>
    </SettingsProvider>
  );
}

// Login nahi hai (ya profile adhoori hai) to onboarding, warna main app
function AuthGate() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-dvh items-center justify-center bg-panel text-accent">
        <SignalLogo size={64} />
      </div>
    );
  }

  if (!user || !user.display_name) return <Onboarding key={user ? "profile" : "guest"} />;

  return (
    <ChatProvider>
      <SignalApp />
    </ChatProvider>
  );
}
