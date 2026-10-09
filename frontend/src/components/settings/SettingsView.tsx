"use client";

import { useState } from "react";
import { ChevronLeft, Bell, Keyboard, Laptop, MessageCircle, Palette, LockKeyhole } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { IconButton, PaneHeader } from "@/components/ui/misc";
import { useAuth } from "@/context/AuthContext";
import { formatPhone } from "@/lib/format";
import {
  AppearanceSection,
  ChatsSection,
  LinkedDevicesSection,
  NotificationsSection,
  PrivacySection,
  ProfileSection,
  ShortcutsSection,
} from "./sections";

type Section = "profile" | "appearance" | "chats" | "notifications" | "privacy" | "devices" | "shortcuts";

const SECTIONS: { id: Section; label: string; icon: React.ReactNode }[] = [
  { id: "appearance", label: "Appearance", icon: <Palette size={20} /> },
  { id: "chats", label: "Chats", icon: <MessageCircle size={20} /> },
  { id: "notifications", label: "Notifications", icon: <Bell size={20} /> },
  { id: "privacy", label: "Privacy", icon: <LockKeyhole size={20} /> },
  { id: "devices", label: "Linked devices", icon: <Laptop size={20} /> },
  { id: "shortcuts", label: "Keyboard shortcuts", icon: <Keyboard size={20} /> },
];

const SECTION_CONTENT: Record<Section, { title: string; component: () => React.ReactNode }> = {
  profile: { title: "Profile", component: ProfileSection },
  appearance: { title: "Appearance", component: AppearanceSection },
  chats: { title: "Chats", component: ChatsSection },
  notifications: { title: "Notifications", component: NotificationsSection },
  privacy: { title: "Privacy", component: PrivacySection },
  devices: { title: "Linked devices", component: LinkedDevicesSection },
  shortcuts: { title: "Keyboard shortcuts", component: ShortcutsSection },
};

export function SettingsView({ onShowTabs }: { onShowTabs?: () => void }) {
  const { user } = useAuth();
  // Mobile pe null = sirf list dikhao. Desktop pe null ho to profile dikhate hain
  const [section, setSection] = useState<Section | null>(null);
  const current = SECTION_CONTENT[section ?? "profile"];
  const CurrentSection = current.component;

  function rowClass(id: Section) {
    const active = (section ?? "profile") === id;
    return `flex w-full items-center gap-3 rounded-[10px] px-4 py-2.5 text-left ${active ? "md:bg-selected" : ""} hover:bg-hover`;
  }

  return (
    <>
      <aside
        className={`${section ? "hidden md:flex" : "flex"} min-w-0 flex-1 flex-col border-r border-line bg-sidebar md:w-[320px] md:flex-none`}
      >
        <PaneHeader title="Settings" onShowTabs={onShowTabs} />
        <div className="flex-1 overflow-y-auto px-2.5 pb-2">
          {user && (
            <button onClick={() => setSection("profile")} className={`${rowClass("profile")} px-2! py-2!`}>
              <Avatar name={user.display_name} color={user.avatar_color} url={user.avatar_url} size={48} />
              <div className="min-w-0">
                <p className="truncate text-[14px] font-semibold">{user.display_name}</p>
                <p className="truncate text-[13px]">{formatPhone(user.phone)}</p>
              </div>
            </button>
          )}
          {/* Profile ke baad patli line, Signal jaisa */}
          <div className="mx-3 my-2 h-px bg-line" />
          {SECTIONS.map((item) => (
            <button key={item.id} onClick={() => setSection(item.id)} className={rowClass(item.id)}>
              {item.icon}
              <span className="text-[14px]">{item.label}</span>
            </button>
          ))}
        </div>
      </aside>

      <section className={`${section ? "flex" : "hidden md:flex"} min-w-0 flex-1 flex-col bg-panel`}>
        {/* Signal mein upar alag header bar nahi, bas beech mein chhota title */}
        <div className="relative flex h-[60px] shrink-0 items-end justify-center pb-1">
          <IconButton label="Back" className="absolute bottom-0 left-3 md:hidden" onClick={() => setSection(null)}>
            <ChevronLeft size={20} />
          </IconButton>
          <h2 className="text-[14px] font-semibold">{current.title}</h2>
        </div>
        <div className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-[640px] px-4 pt-6 pb-8 md:px-8">
            <CurrentSection />
          </div>
        </div>
      </section>
    </>
  );
}
