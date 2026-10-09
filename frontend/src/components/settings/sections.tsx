"use client";

import { useState } from "react";
import { Laptop, LogOut, Palette, SunMoon } from "lucide-react";
import { AvatarPicker } from "@/components/ui/AvatarPicker";
import { Button } from "@/components/ui/Modal";
import { Toggle } from "@/components/ui/misc";
import { useAuth } from "@/context/AuthContext";
import { type Theme, useSettings } from "@/context/SettingsContext";
import { useToast } from "@/context/ToastContext";
import { api } from "@/lib/api";
import { AVATAR_COLORS } from "@/lib/avatarColors";
import { formatPhone } from "@/lib/format";
import type { User } from "@/lib/types";

const inputClass =
  "w-full rounded-lg bg-input px-3 py-2 text-[14px] outline-none focus:ring-2 focus:ring-brand disabled:opacity-60";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block py-2">
      <span className="mb-1 block text-[13px] text-secondary">{label}</span>
      {children}
    </label>
  );
}


function SettingsGroup({ title, note, children }: { title?: string; note?: string; children: React.ReactNode }) {
  return (
    <div className="mb-5">
      {title && <p className="mb-2 px-4 text-[14px] font-semibold">{title}</p>}
      <div className="rounded-xl bg-card px-4 py-1.5">{children}</div>
      {note && <p className="mt-2 px-4 text-[13px] text-secondary">{note}</p>}
    </div>
  );
}

function SettingRow({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-2">
      <div>
        <p className="text-[14px]">{title}</p>
        {description && <p className="mt-0.5 text-[13px] text-secondary">{description}</p>}
      </div>
      {children}
    </div>
  );
}

export function ProfileSection() {
  const { user, setUser, logout } = useAuth();
  const { showToast } = useToast();
  const [displayName, setDisplayName] = useState(user?.display_name ?? "");
  const [about, setAbout] = useState(user?.about ?? "");
  const [username, setUsername] = useState(user?.username ?? "");
  const [busy, setBusy] = useState(false);

  if (!user) return null;

  async function save(changes: Partial<User>) {
    setBusy(true);
    try {
      setUser(await api<User>("/api/users/me", { method: "PATCH", body: changes }));
      showToast("Profile updated");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Couldn't update profile");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      {/* Photo aur color turant save ho jaate hain */}
      <AvatarPicker
        name={user.display_name}
        color={user.avatar_color}
        url={user.avatar_url}
        onChange={(url) => save({ avatar_url: url })}
      />
      <div className="mt-4 flex flex-wrap justify-center gap-2">
        {Object.entries(AVATAR_COLORS).map(([key, color]) => (
          <button
            key={key}
            onClick={() => save({ avatar_color: key, avatar_url: null })}
            aria-label={`Avatar color ${key}`}
            className={`h-7 w-7 rounded-full ${user.avatar_color === key && !user.avatar_url ? "ring-2 ring-accent ring-offset-2 ring-offset-panel" : ""}`}
            style={{ background: color.bg, border: `2px solid ${color.fg}` }}
          />
        ))}
      </div>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          save({
            display_name: displayName.trim(),
            about: about.trim(),
            username: username.trim().replace(/^@/, "") || null,
          });
        }}
      >
        <div className="mt-6 rounded-xl bg-card px-4 py-1.5">
          <Field label="Name">
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              maxLength={64}
              className={inputClass}
            />
          </Field>
          <Field label="About">
            <input
              value={about}
              onChange={(e) => setAbout(e.target.value)}
              maxLength={140}
              placeholder="Write a few words about yourself"
              className={inputClass}
            />
          </Field>
          <Field label="Username">
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              maxLength={32}
              placeholder="Set a username"
              className={inputClass}
            />
          </Field>
          <Field label="Phone number">
            <input value={formatPhone(user.phone)} disabled className={inputClass} />
          </Field>
        </div>
        <p className="mt-2 px-4 text-[13px] text-secondary">
          Your profile and changes to it will be visible to people you message, contacts and groups.
        </p>
        <div className="mt-5 flex justify-end">
          <Button disabled={busy || !displayName.trim()}>Save</Button>
        </div>
      </form>

      <div className="mt-6 rounded-xl bg-card p-1.5">
        <button
          onClick={logout}
          className="flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-[14px] text-danger hover:bg-hover"
        >
          <LogOut size={18} /> Log out
        </button>
      </div>
    </div>
  );
}

export function AppearanceSection() {
  const { theme, setTheme } = useSettings();

  return (
    <SettingsGroup>
      <div className="flex items-center gap-3 py-2">
        <SunMoon size={18} />
        <p className="flex-1 text-[14px]">Theme</p>
        <select
          value={theme}
          onChange={(e) => setTheme(e.target.value as Theme)}
          className="rounded-full bg-selected px-3 py-1 text-[13px] font-semibold outline-none"
        >
          <option value="system">System</option>
          <option value="light">Light</option>
          <option value="dark">Dark</option>
        </select>
      </div>
      <div className="flex items-center gap-3 py-2">
        <Palette size={18} />
        <p className="flex-1 text-[14px]">Chat color</p>
        <span className="h-5 w-5 rounded-full bg-accent" />
      </div>
    </SettingsGroup>
  );
}

export function NotificationsSection() {
  const { notifications, setNotifications } = useSettings();
  return (
    <>
      <SettingsGroup>
        <SettingRow title="Enable notifications" description="Show a toast when a new message arrives in another chat">
          <Toggle checked={notifications} onChange={setNotifications} />
        </SettingRow>
      </SettingsGroup>
      <SettingsGroup title="Sounds">
        <SettingRow title="Push notification sounds" description="Coming soon">
          <Toggle checked={false} onChange={() => null} disabled />
        </SettingRow>
      </SettingsGroup>
    </>
  );
}

export function PrivacySection() {
  const { typingIndicators, setTypingIndicators } = useSettings();
  return (
    <>
      <SettingsGroup
        title="Messaging"
        note="See and share when messages are being read and typed. If typing indicators are off, you won't see them from others either."
      >
        <SettingRow title="Read receipts" description="Coming soon: turning this off is not supported yet">
          <Toggle checked onChange={() => null} disabled />
        </SettingRow>
        <SettingRow title="Typing indicators">
          <Toggle checked={typingIndicators} onChange={setTypingIndicators} />
        </SettingRow>
      </SettingsGroup>
      <SettingsGroup title="Application">
        <SettingRow title="Screen lock" description="Coming soon">
          <Toggle checked={false} onChange={() => null} disabled />
        </SettingRow>
      </SettingsGroup>
    </>
  );
}

export function ChatsSection() {
  return (
    <SettingsGroup title="Text input">
      <SettingRow title="Spell check text entered in message composition box" description="Coming soon">
        <Toggle checked={false} onChange={() => null} disabled />
      </SettingRow>
      <SettingRow title="Generate link previews" description="Coming soon">
        <Toggle checked={false} onChange={() => null} disabled />
      </SettingRow>
    </SettingsGroup>
  );
}

export function LinkedDevicesSection() {
  return (
    <div className="flex flex-col items-center py-10 text-center">
      <Laptop size={48} className="text-tertiary" />
      <p className="mt-4 font-medium">Linked devices are coming soon</p>
      <p className="mt-1 max-w-xs text-sm text-secondary">
        Use Signal on your desktop or iPad by linking it to this account.
      </p>
    </div>
  );
}

const SHORTCUTS = [
  { keys: "Ctrl + N", action: "Start a new chat" },
  { keys: "Ctrl + F", action: "Search chats" },
  { keys: "Alt + ↑ / ↓", action: "Previous / next chat" },
  { keys: "Ctrl + ,", action: "Open settings" },
  { keys: "Enter", action: "Send message" },
  { keys: "Shift + Enter", action: "New line" },
  { keys: "Esc", action: "Close dialog" },
];

export function ShortcutsSection() {
  return (
    <SettingsGroup>
      {SHORTCUTS.map((shortcut) => (
        <div key={shortcut.keys} className="flex items-center justify-between py-2">
          <span className="text-[14px]">{shortcut.action}</span>
          <kbd className="rounded-md bg-input px-2 py-1 font-mono text-xs">{shortcut.keys}</kbd>
        </div>
      ))}
    </SettingsGroup>
  );
}
