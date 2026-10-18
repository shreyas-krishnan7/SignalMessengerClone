"use client";

import { useState } from "react";
import { CheckCheck, Ellipsis, ListFilter, Search, SquarePen, UserPlus, Users, X } from "lucide-react";
import { ContactRow } from "@/components/ContactRow";
import { Menu, MenuItem } from "@/components/ui/Menu";
import { IconButton, PaneHeader } from "@/components/ui/misc";
import { useAuth } from "@/context/AuthContext";
import { useChat } from "@/context/ChatContext";
import { useToast } from "@/context/ToastContext";
import { userMatches } from "@/lib/chatUtils";
import { useMinuteTick } from "@/lib/hooks";
import type { Conversation } from "@/lib/types";
import { ChatListItem } from "./ChatListItem";
import { NewChatPanel } from "./NewChatPanel";

interface ChatListProps {
  className: string;
  searchRef: React.RefObject<HTMLInputElement | null>;
  composing: boolean;
  onComposingChange: (composing: boolean) => void;
  onNewGroup: () => void;
  onAddContact: () => void;
  onShowTabs?: () => void;
}

export function ChatList({
  className,
  searchRef,
  composing,
  onComposingChange,
  onNewGroup,
  onAddContact,
  onShowTabs,
}: ChatListProps) {
  const { user } = useAuth();
  const { conversations, contacts, activeConversation, openConversation, startDirectChat, markAllRead, typingUserIds } =
    useChat();
  const { showToast } = useToast();
  const [query, setQuery] = useState("");
  // Signal mein ek hi filter hai: sirf unread chats
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  useMinuteTick();

  const myId = user?.id ?? 0;
  const search = query.trim().toLowerCase();

  function conversationMatches(conversation: Conversation) {
    if (unreadOnly && conversation.unread_count === 0) return false;
    if (!search) return true;
    if (conversation.title.toLowerCase().includes(search)) return true;
    // 1:1 chat ko saamne wale ke username/phone se bhi dhoondh sakte hain
    const other = conversation.members.find((m) => m.id !== myId);
    return conversation.type === "direct" && !!other && userMatches(other, search);
  }

  const visibleConversations = conversations.filter(conversationMatches);

  // Search karte waqt wo contacts bhi dikhao jinke saath abhi koi chat nahi hai
  const usersWithChats = new Set(
    conversations.filter((c) => c.type === "direct" && c.last_message).flatMap((c) => c.members.map((m) => m.id)),
  );
  const matchingContacts = search
    ? contacts.filter((contact) => !usersWithChats.has(contact.user.id) && userMatches(contact.user, search))
    : [];

  function openContactChat(userId: number) {
    setQuery("");
    startDirectChat(userId).catch(() => showToast("Couldn't open chat"));
  }

  const nothingFound = visibleConversations.length === 0 && matchingContacts.length === 0;
  const asideClass = `${className} min-w-0 flex-1 flex-col border-r border-line bg-sidebar md:w-[320px] md:flex-none`;

  if (composing) {
    return (
      <aside className={asideClass}>
        <NewChatPanel onBack={() => onComposingChange(false)} onNewGroup={onNewGroup} onAddContact={onAddContact} />
      </aside>
    );
  }

  return (
    <aside className={asideClass}>
      <PaneHeader title="Chats" onShowTabs={onShowTabs}>
        <IconButton label="New chat (Ctrl+N)" onClick={() => onComposingChange(true)}>
          <SquarePen size={20} />
        </IconButton>
        <IconButton label="More options" onClick={() => setMenuOpen(true)}>
          <Ellipsis size={20} />
        </IconButton>
        {menuOpen && (
          <Menu onClose={() => setMenuOpen(false)} className="top-9 right-0">
            <MenuItem icon={<Users size={16} />} label="New group" onClick={onNewGroup} />
            <MenuItem icon={<UserPlus size={16} />} label="Add contact" onClick={onAddContact} />
            <MenuItem icon={<CheckCheck size={16} />} label="Mark all read" onClick={markAllRead} />
          </Menu>
        )}
      </PaneHeader>

      <div className="flex items-center gap-2 pr-3 pl-4">
        <div className="relative flex-1">
          <Search size={16} className="absolute top-1/2 left-2.5 -translate-y-1/2 text-tertiary" />
          <input
            ref={searchRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Escape" && setQuery("")}
            placeholder={unreadOnly ? "Search unread chats" : "Search"}
            className="h-7 w-full rounded-lg bg-input pr-8 pl-8 text-[13px] outline-none placeholder:text-tertiary focus:ring-2 focus:ring-brand"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="absolute top-1/2 right-2 -translate-y-1/2 text-secondary"
              aria-label="Clear search"
            >
              <X size={16} />
            </button>
          )}
        </div>
        {/* Filter on ho to button gol aur brand color ka ho jata hai */}
        <IconButton
          label={unreadOnly ? "Clear filter" : "Filter by unread"}
          onClick={() => setUnreadOnly(!unreadOnly)}
          className={unreadOnly ? "bg-brand! text-white!" : ""}
        >
          <ListFilter size={18} />
        </IconButton>
      </div>

      <div className="mt-2 flex-1 overflow-y-auto px-2 pb-2">
        {unreadOnly && <p className="px-3 pt-1 pb-2 text-[14px] font-semibold">Filtered by unread</p>}

        {visibleConversations.map((conversation) => (
          <ChatListItem
            key={conversation.id}
            conversation={conversation}
            myId={myId}
            active={conversation.id === activeConversation?.id}
            isTyping={typingUserIds(conversation.id).length > 0}
            onClick={() => openConversation(conversation.id)}
          />
        ))}

        {matchingContacts.length > 0 && (
          <>
            <p className="px-3 pt-3 pb-1 text-[14px] font-semibold">Contacts</p>
            {matchingContacts.map((contact) => (
              <ContactRow key={contact.id} user={contact.user} onClick={() => openContactChat(contact.user.id)} />
            ))}
          </>
        )}

        {nothingFound && search && (
          <p className="px-6 py-10 text-center text-[13px] text-secondary">No results for &quot;{query}&quot;</p>
        )}
        {nothingFound && !search && unreadOnly && (
          <div className="flex flex-col items-center px-6 py-8 text-center">
            <p className="text-[14px]">No unread chats</p>
            <button
              onClick={() => setUnreadOnly(false)}
              className="mt-3 rounded-full bg-selected px-3 py-1 text-[13px] font-semibold hover:bg-hover"
            >
              Clear filter
            </button>
          </div>
        )}
        {nothingFound && !search && !unreadOnly && (
          <div className="flex h-full flex-col items-center justify-center px-6 pb-16 text-center">
            <p className="text-[17px] font-semibold text-secondary">No chats</p>
            <p className="mt-2 text-[13px] text-secondary">Recent chats will appear here.</p>
          </div>
        )}
      </div>
    </aside>
  );
}
