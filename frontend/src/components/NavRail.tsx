"use client";

import { Menu as MenuIcon, MessageCircle, Phone, Settings } from "lucide-react";
import { useChat } from "@/context/ChatContext";
import type { View } from "./SignalApp";

interface Tab {
  id: View;
  label: string;
  icon: React.ReactNode;
  badge: number;
}

function StoriesIcon({ filled }: { filled: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="6.5" y="2.75" width="10.5" height="14.5" rx="2.5" fill={filled ? "currentColor" : "none"} />
      <path d="M4 4.5a2 2 0 0 0-1.25 1.85v7.3A2 2 0 0 0 4 15.5" strokeLinecap="round" />
    </svg>
  );
}

// Desktop rail aur mobile bottom bar dono ke liye same tabs
function useTabs(view: View): Tab[] {
  const { conversations } = useChat();
  // Chats icon pe kitni chats mein unread messages hain
  const unreadChats = conversations.filter((c) => c.unread_count > 0).length;
  // Selected tab ka icon bhara hua (filled) dikhta hai, baaki outline
  const fill = (tab: View) => (view === tab ? "currentColor" : "none");

  return [
    { id: "chats", label: "Chats", icon: <MessageCircle size={20} fill={fill("chats")} />, badge: unreadChats },
    { id: "calls", label: "Calls", icon: <Phone size={19} fill={fill("calls")} />, badge: 0 },
    { id: "stories", label: "Stories", icon: <StoriesIcon filled={view === "stories"} />, badge: 0 },
    { id: "settings", label: "Settings", icon: <Settings size={20} />, badge: 0 },
  ];
}

function UnreadBadge({ count, className }: { count: number; className: string }) {
  if (count <= 0) return null;
  return (
    <span
      className={`absolute flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-semibold text-white ${className}`}
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}

function RailButton({ tab, active, onClick }: { tab: Tab; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-label={tab.label}
      title={tab.label}
      className={`relative flex h-10 w-14 items-center justify-center rounded-[10px] ${active ? "bg-selected" : "hover:bg-hover"}`}
    >
      {tab.icon}
      <UnreadBadge count={tab.badge} className="top-0.5 right-1.5" />
    </button>
  );
}

export function NavRail({
  view,
  onChangeView,
  onHideTabs,
}: {
  view: View;
  onChangeView: (view: View) => void;
  onHideTabs: () => void;
}) {
  const [chats, calls, stories, settings] = useTabs(view);

  return (
    <nav className="hidden w-20 shrink-0 flex-col items-center justify-between border-r border-line bg-rail pt-2 pb-3 md:flex">
      <div className="flex flex-col items-center gap-1">
        <button
          onClick={onHideTabs}
          aria-label="Hide tabs"
          title="Hide tabs"
          className="mb-1 flex h-10 w-14 items-center justify-center rounded-[10px] hover:bg-hover"
        >
          <MenuIcon size={20} />
        </button>
        {[chats, calls, stories].map((tab) => (
          <RailButton key={tab.id} tab={tab} active={view === tab.id} onClick={() => onChangeView(tab.id)} />
        ))}
      </div>

      {/* Settings sabse neeche */}
      <RailButton tab={settings} active={view === "settings"} onClick={() => onChangeView("settings")} />
    </nav>
  );
}

// Mobile pe Signal app jaisa neeche tab bar: icon ke peeche pill, neeche label
export function BottomTabs({ view, onChangeView }: { view: View; onChangeView: (view: View) => void }) {
  const tabs = useTabs(view);

  return (
    <nav className="flex shrink-0 justify-around border-t border-line bg-rail pt-2 pb-3 md:hidden">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChangeView(tab.id)}
          className="relative flex flex-col items-center gap-1 text-[13px] font-medium"
        >
          <span
            className={`flex h-8 w-16 items-center justify-center rounded-full ${view === tab.id ? "bg-selected" : ""}`}
          >
            {tab.icon}
          </span>
          {tab.label}
          <UnreadBadge count={tab.badge} className="-top-1 right-2" />
        </button>
      ))}
    </nav>
  );
}
