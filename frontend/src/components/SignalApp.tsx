"use client";

import { useEffect, useRef, useState } from "react";
import { CircleDashed, Phone } from "lucide-react";
import { ChatList } from "@/components/chat-list/ChatList";
import { ChatPane } from "@/components/chat/ChatPane";
import { EmptyChatPane } from "@/components/chat/EmptyChatPane";
import { AddContactModal } from "@/components/modals/AddContactModal";
import { NewGroupModal } from "@/components/modals/NewGroupModal";
import { ComingSoonView } from "@/components/ComingSoonView";
import { BottomTabs, NavRail } from "@/components/NavRail";
import { SettingsView } from "@/components/settings/SettingsView";
import { useChat } from "@/context/ChatContext";

export type View = "chats" | "calls" | "stories" | "settings";
type ModalName = "new-group" | "add-contact" | null;

export function SignalApp() {
  const { conversations, activeConversation, openConversation } = useChat();
  const [view, setView] = useState<View>("chats");
  const [modal, setModal] = useState<ModalName>(null);
  // Chat list ki jagah "New chat" panel khula hai ya nahi
  const [composing, setComposing] = useState(false);
  // Hamburger se left wali tabs (nav rail) chhupa sakte hain, Signal jaisa
  const [tabsHidden, setTabsHidden] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const showTabs = tabsHidden ? () => setTabsHidden(false) : undefined;

  // Keyboard shortcuts (Signal desktop jaise)
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const ctrl = event.ctrlKey || event.metaKey;
      if (ctrl && event.key.toLowerCase() === "n") {
        event.preventDefault();
        setView("chats");
        setComposing(true);
      } else if (ctrl && event.key.toLowerCase() === "f") {
        event.preventDefault();
        setView("chats");
        setComposing(false);
        setTimeout(() => searchRef.current?.focus(), 0);
      } else if (ctrl && event.key === ",") {
        event.preventDefault();
        setView("settings");
      } else if (event.altKey && (event.key === "ArrowDown" || event.key === "ArrowUp")) {
        // Alt + Up/Down se pichli/agli chat kholo
        event.preventDefault();
        const index = conversations.findIndex((c) => c.id === activeConversation?.id);
        const nextIndex = event.key === "ArrowDown" ? index + 1 : index - 1;
        const next = conversations[Math.max(0, Math.min(conversations.length - 1, nextIndex))];
        if (next) {
          setView("chats");
          openConversation(next.id);
        }
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [conversations, activeConversation, openConversation]);

  // Mobile pe chat khuli ho to sirf chat dikhao (list aur nav chhupa do)
  const chatOpen = view === "chats" && activeConversation !== null;

  return (
    // Desktop: left mein nav rail. Mobile: neeche tab bar (Signal phone app jaisa)
    <div className="flex h-dvh flex-col overflow-hidden bg-panel text-primary">
      <div className="flex min-h-0 flex-1">
        {!tabsHidden && <NavRail view={view} onChangeView={setView} onHideTabs={() => setTabsHidden(true)} />}

        {view === "chats" && (
          <>
            <ChatList
              className={chatOpen ? "hidden md:flex" : "flex"}
              searchRef={searchRef}
              composing={composing}
              onComposingChange={setComposing}
              onNewGroup={() => setModal("new-group")}
              onAddContact={() => setModal("add-contact")}
              onShowTabs={showTabs}
            />
            {activeConversation ? <ChatPane key={activeConversation.id} /> : <EmptyChatPane />}
          </>
        )}

        {view === "calls" && (
          <ComingSoonView
            title="Calls"
            icon={<Phone size={40} />}
            emptyTitle="No calls"
            emptyText="Recent calls will appear here."
            message="Voice and video calls are coming soon."
            onShowTabs={showTabs}
          />
        )}
        {view === "stories" && (
          <ComingSoonView
            title="Stories"
            icon={<CircleDashed size={40} />}
            emptyTitle="No stories"
            emptyText="Stories from your contacts will appear here."
            message="Share stories that disappear after 24 hours. Coming soon."
            onShowTabs={showTabs}
          />
        )}
        {view === "settings" && <SettingsView onShowTabs={showTabs} />}
      </div>

      {!chatOpen && <BottomTabs view={view} onChangeView={setView} />}

      {modal === "new-group" && <NewGroupModal onClose={() => setModal(null)} />}
      {modal === "add-contact" && <AddContactModal onClose={() => setModal(null)} />}
    </div>
  );
}
