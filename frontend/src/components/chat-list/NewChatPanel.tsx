"use client";

import { useEffect, useState } from "react";
import { AtSign, ChevronLeft, Hash, Users } from "lucide-react";
import { ContactRow } from "@/components/ContactRow";
import { IconButton, SearchInput, SectionLabel } from "@/components/ui/misc";
import { useChat } from "@/context/ChatContext";
import { useToast } from "@/context/ToastContext";
import { api } from "@/lib/api";
import { useDebouncedValue } from "@/lib/hooks";
import type { User } from "@/lib/types";

// Gol icon wali row: "New group", "Find by username" jaisi
function ActionRow({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left hover:bg-hover">
      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-selected">{icon}</span>
      <span className="text-[14px]">{label}</span>
    </button>
  );
}

// Signal mein "New chat" alag popup nahi, chat list ki jagah hi khulta hai
export function NewChatPanel({
  onBack,
  onNewGroup,
  onAddContact,
}: {
  onBack: () => void;
  onNewGroup: () => void;
  onAddContact: () => void;
}) {
  const { contacts, startDirectChat } = useChat();
  const { showToast } = useToast();
  const [query, setQuery] = useState("");
  const [otherUsers, setOtherUsers] = useState<User[]>([]);
  const search = useDebouncedValue(query.trim().toLowerCase());

  // Contacts ke alawa baaki Signal users bhi server se dhoondo
  useEffect(() => {
    if (search.length < 2) {
      setOtherUsers([]);
      return;
    }
    let cancelled = false;
    api<User[]>(`/api/users/search?q=${encodeURIComponent(search)}`)
      .then((users) => {
        if (!cancelled) setOtherUsers(users);
      })
      .catch(() => null);
    return () => {
      cancelled = true; // purani request ka result baad mein aaye to ignore
    };
  }, [search]);

  const contactIds = new Set(contacts.map((c) => c.user.id));
  const visibleContacts = contacts.filter(
    (c) =>
      c.user.display_name.toLowerCase().includes(search) ||
      (c.user.username ?? "").includes(search) ||
      c.user.phone.includes(search),
  );
  const nonContacts = otherUsers.filter((u) => !contactIds.has(u.id));

  async function openChat(userId: number) {
    try {
      await startDirectChat(userId);
      onBack();
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Couldn't start chat");
    }
  }

  return (
    <>
      <div className="relative flex h-[52px] shrink-0 items-center justify-center px-4">
        <IconButton label="Back" className="absolute left-3" onClick={onBack}>
          <ChevronLeft size={20} />
        </IconButton>
        <h1 className="text-[15px] font-semibold">New chat</h1>
      </div>

      <div className="px-4">
        <SearchInput value={query} onChange={setQuery} placeholder="Name, username, or number" />
      </div>

      <div className="flex-1 overflow-y-auto px-2 pb-2">
        {!query && (
          <>
            <ActionRow icon={<Users size={18} />} label="New group" onClick={onNewGroup} />
            <ActionRow icon={<AtSign size={18} />} label="Find by username" onClick={onAddContact} />
            <ActionRow icon={<Hash size={18} />} label="Find by phone number" onClick={onAddContact} />
          </>
        )}

        {visibleContacts.length > 0 && <SectionLabel>Contacts</SectionLabel>}
        {visibleContacts.map((contact) => (
          <ContactRow key={contact.id} user={contact.user} onClick={() => openChat(contact.user.id)} />
        ))}

        {nonContacts.length > 0 && <SectionLabel>Other Signal users</SectionLabel>}
        {nonContacts.map((user) => (
          <ContactRow key={user.id} user={user} onClick={() => openChat(user.id)} />
        ))}

        {query && visibleContacts.length === 0 && nonContacts.length === 0 && (
          <p className="py-6 text-center text-sm text-secondary">No users found for &quot;{query}&quot;</p>
        )}
      </div>
    </>
  );
}
