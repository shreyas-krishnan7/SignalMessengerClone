"use client";

import { useState } from "react";
import { Search, X } from "lucide-react";
import { ConversationDetails } from "@/components/details/ConversationDetails";
import { useChat } from "@/context/ChatContext";
import type { Message } from "@/lib/types";
import { ChatHeader } from "./ChatHeader";
import { Composer } from "./Composer";
import { MessageList } from "./MessageList";

export function ChatPane() {
  const { activeConversation: conversation } = useChat();
  const [showDetails, setShowDetails] = useState(false);
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  // null = search band hai, string = search bar khula hai
  const [search, setSearch] = useState<string | null>(null);

  if (!conversation) return null;

  // Header pe click karne se chat ki jagah "Chat settings" screen khulti hai (Signal jaisa)
  if (showDetails) {
    return <ConversationDetails conversation={conversation} onBack={() => setShowDetails(false)} />;
  }

  return (
    <section className="flex min-w-0 flex-1 flex-col bg-panel">
      <ChatHeader
        conversation={conversation}
        onOpenDetails={() => setShowDetails(true)}
        onSearch={() => setSearch(search === null ? "" : null)}
      />
      {search !== null && (
        <div className="flex items-center gap-2 border-b border-line px-4 py-2">
          <div className="relative flex-1">
            <Search size={16} className="absolute top-1/2 left-2.5 -translate-y-1/2 text-tertiary" />
            <input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Escape" && setSearch(null)}
              placeholder="Search messages in this chat"
              className="h-7 w-full rounded-lg bg-input pr-3 pl-8 text-[13px] outline-none placeholder:text-tertiary focus:ring-2 focus:ring-brand"
            />
          </div>
          <button
            onClick={() => setSearch(null)}
            aria-label="Close search"
            className="flex h-7 w-7 items-center justify-center rounded-full text-secondary hover:bg-hover"
          >
            <X size={16} />
          </button>
        </div>
      )}
      <MessageList conversation={conversation} onReply={setReplyTo} search={search ?? ""} />
      <Composer conversation={conversation} replyTo={replyTo} onCancelReply={() => setReplyTo(null)} />
    </section>
  );
}
