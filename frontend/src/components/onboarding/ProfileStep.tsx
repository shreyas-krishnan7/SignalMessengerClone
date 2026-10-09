"use client";

import { useState } from "react";
import { AvatarPicker } from "@/components/ui/AvatarPicker";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import type { User } from "@/lib/types";

export function ProfileStep() {
  const { user, setUser, logout } = useAuth();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(user?.avatar_url ?? null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const displayName = `${firstName.trim()} ${lastName.trim()}`.trim();

  async function saveProfile(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const updated = await api<User>("/api/users/me", {
        method: "PATCH",
        body: { display_name: displayName, avatar_url: avatarUrl },
      });
      // display_name set hote hi AuthGate main app pe le jayega
      setUser(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save profile");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={saveProfile}>
      <h1 className="text-2xl font-semibold">Set up your profile</h1>
      <p className="mt-2 text-sm text-secondary">Profiles are visible to people you message, contacts, and groups.</p>

      <div className="mt-6">
        <AvatarPicker name={displayName} color={user?.avatar_color ?? "A100"} url={avatarUrl} onChange={setAvatarUrl} />
      </div>

      <input
        autoFocus
        value={firstName}
        onChange={(e) => setFirstName(e.target.value)}
        placeholder="First name (required)"
        maxLength={32}
        className="mt-6 w-full rounded-lg bg-input px-3 py-3 text-[15px] outline-none focus:ring-2 focus:ring-accent"
      />
      <input
        value={lastName}
        onChange={(e) => setLastName(e.target.value)}
        placeholder="Last name (optional)"
        maxLength={31}
        className="mt-3 w-full rounded-lg bg-input px-3 py-3 text-[15px] outline-none focus:ring-2 focus:ring-accent"
      />

      {error && <p className="mt-3 text-sm text-danger">{error}</p>}

      <button
        disabled={busy || !firstName.trim()}
        className="mt-6 w-full rounded-full bg-accent py-3 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-50"
      >
        {busy ? "Saving..." : "Next"}
      </button>
      <button type="button" onClick={logout} className="mt-3 w-full py-2 text-sm text-secondary hover:text-primary">
        Use a different number
      </button>
    </form>
  );
}
