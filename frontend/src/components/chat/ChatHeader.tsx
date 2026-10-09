"use client";

import { useState } from "react";
import { ArrowLeft, Ellipsis, Phone, Search, Settings2, Timer, Video, X } from "lucide-react";
import { ConversationAvatar } from "@/components/ui/Avatar";
import { Menu, MenuItem } from "@/components/ui/Menu";
import { IconButton } from "@/components/ui/misc";
import { useAuth } from "@/context/AuthContext";
import { useChat } from "@/context/ChatContext";
import { useToast } from "@/context/ToastContext";
import { firstName, formatLastSeen } from "@/lib/format";
import { useMinuteTick } from "@/lib/hooks";
import type { Conversation } from "@/lib/types";

export function ChatHeader({
  conversation,
  onOpenDetails,
  onSearch,
}: {
  conversation: Conversation;
  onOpenDetails: () => void;
  onSearch: () => void;
}) {
  const { user } = useAuth();
  const { openConversation, typingUserIds } = useChat();
  const { showToast } = useToast();
  const [menuOpen, setMenuOpen] = useState(false);
  useMinuteTick();

  const myId = user?.id ?? 0;
  const typingNames = typingUserIds(conversation.id).map((id) =>
    firstName(conversation.members.find((m) => m.id === id)?.display_name ?? "Someone"),
  );

  // Naam ke neeche wali line: typing / online / last seen / members count
  let subtitle: string;
  if (typingNames.length > 0) {
    subtitle = conversation.type === "group" ? `${typingNames.join(", ")} typing…` : "typing…";
  } else if (conversation.type === "group") {
    subtitle = `${conversation.members.length} members`;
  } else {
    const other = conversation.members.find((m) => m.id !== myId);
    subtitle = !other ? "" : other.is_online ? "Online" : formatLastSeen(other.last_seen_at);
  }

  return (
    <header className="flex h-[52px] shrink-0 items-center gap-2 border-b border-line px-2 md:px-4">
      <IconButton label="Back" className="md:hidden" onClick={() => openConversation(null)}>
        <ArrowLeft size={20} />
      </IconButton>

      <button onClick={onOpenDetails} className="flex min-w-0 items-center gap-3 text-left">
        <ConversationAvatar conversation={conversation} myId={myId} size={32} />
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <h2 className="truncate text-[14px] font-semibold">{conversation.title}</h2>
            {conversation.disappearing_seconds > 0 && <Timer size={14} className="shrink-0 text-secondary" />}
          </div>
          <p className={`truncate text-[13px] ${typingNames.length > 0 ? "text-accent" : "text-secondary"}`}>
            {subtitle}
          </p>
        </div>
      </button>

      <div className="relative ml-auto flex items-center gap-1">
        <IconButton label="Video call" onClick={() => showToast("Video calls are coming soon")}>
          <Video size={20} />
        </IconButton>
        <IconButton label="Voice call" onClick={() => showToast("Voice calls are coming soon")}>
          <Phone size={18} />
        </IconButton>
        <IconButton label="Search messages" onClick={onSearch}>
          <Search size={19} />
        </IconButton>
        <IconButton label="More options" onClick={() => setMenuOpen(true)}>
          <Ellipsis size={20} />
        </IconButton>
        {menuOpen && (
          <Menu onClose={() => setMenuOpen(false)} className="top-9 right-0">
            <MenuItem icon={<Settings2 size={16} />} label="Chat settings" onClick={onOpenDetails} />
            <MenuItem icon={<Timer size={16} />} label="Disappearing messages" onClick={onOpenDetails} />
            <MenuItem icon={<X size={16} />} label="Close chat" onClick={() => openConversation(null)} />
          </Menu>
        )}
      </div>
    </header>
  );
}
