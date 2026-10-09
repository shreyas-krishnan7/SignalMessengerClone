"use client";

import { Menu as MenuIcon, MessageCircle, Phone, Settings } from "lucide-react";
import { useChat } from "@/context/ChatContext";
import type { View } from "./SignalApp";


function StoriesIcon({ filled }: { filled: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="6.5" y="2.75" width="10.5" height="14.5" rx="2.5" fill={filled ? "currentColor" : "none"} />
      <path d="M4 4.5a2 2 0 0 0-1.25 1.85v7.3A2 2 0 0 0 4 15.5" strokeLinecap="round" />
    </svg>
  );
}

function RailButton({
  label,
  icon,
  active,
  badge = 0,
  onClick,
}: {
  label: string;
  icon: React.ReactNode;
  active: boolean;
  badge?: number;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`relative flex h-10 w-14 items-center justify-center rounded-[10px] ${active ? "bg-selected" : "hover:bg-hover"}`}
    >
      {icon}
      {badge > 0 && (
        <span className="absolute top-0.5 right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-semibold text-white">
          {badge > 99 ? "99+" : badge}
        </span>
      )}
    </button>
  );
}

export function NavRail({
  view,
  onChangeView,
  onHideTabs,
  className = "",
}: {
  view: View;
  onChangeView: (view: View) => void;
  onHideTabs: () => void;
  className?: string;
}) {
  const { conversations } = useChat();
  // Chats icon pe kitni chats mein unread messages hain
  const unreadChats = conversations.filter((c) => c.unread_count > 0).length;
  // Selected tab ka icon bhara hua (filled) dikhta hai, baaki outline
  const fill = (tab: View) => (view === tab ? "currentColor" : "none");

  return (
    <nav
      className={`${className} hidden w-20 shrink-0 flex-col items-center justify-between border-r border-line bg-rail pt-2 pb-3 md:flex`}
    >
      <div className="flex flex-col items-center gap-1">
        <button
          onClick={onHideTabs}
          aria-label="Hide tabs"
          title="Hide tabs"
          className="mb-1 flex h-10 w-14 items-center justify-center rounded-[10px] hover:bg-hover"
        >
          <MenuIcon size={20} />
        </button>
        <RailButton
          label="Chats"
          icon={<MessageCircle size={20} fill={fill("chats")} />}
          active={view === "chats"}
          badge={unreadChats}
          onClick={() => onChangeView("chats")}
        />
        <RailButton
          label="Calls"
          icon={<Phone size={19} fill={fill("calls")} />}
          active={view === "calls"}
          onClick={() => onChangeView("calls")}
        />
        <RailButton
          label="Stories"
          icon={<StoriesIcon filled={view === "stories"} />}
          active={view === "stories"}
          onClick={() => onChangeView("stories")}
        />
      </div>

      <RailButton
        label="Settings"
        icon={<Settings size={20} />}
        active={view === "settings"}
        onClick={() => onChangeView("settings")}
      />
    </nav>
  );
}

// Mobile pe Signal app jaisa neeche tab bar: icon ke peeche pill, neeche label
export function BottomTabs({ view, onChangeView }: { view: View; onChangeView: (view: View) => void }) {
  const { conversations } = useChat();
  const unreadChats = conversations.filter((c) => c.unread_count > 0).length;
  const fill = (tab: View) => (view === tab ? "currentColor" : "none");

  const tabs: { id: View; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: "chats", label: "Chats", icon: <MessageCircle size={20} fill={fill("chats")} />, badge: unreadChats },
    { id: "calls", label: "Calls", icon: <Phone size={19} fill={fill("calls")} /> },
    { id: "stories", label: "Stories", icon: <StoriesIcon filled={view === "stories"} /> },
    { id: "settings", label: "Settings", icon: <Settings size={20} /> },
  ];

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
          {!!tab.badge && (
            <span className="absolute -top-1 right-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-semibold text-white">
              {tab.badge > 99 ? "99+" : tab.badge}
            </span>
          )}
        </button>
      ))}
    </nav>
  );
}
