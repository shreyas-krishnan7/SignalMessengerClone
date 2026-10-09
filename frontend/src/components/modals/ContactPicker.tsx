"use client";

import { useState } from "react";
import { ContactRow } from "@/components/ContactRow";
import { RoundCheckbox, SearchInput } from "@/components/ui/misc";
import { useChat } from "@/context/ChatContext";

// Group banane / members add karne ke liye contacts ki list with checkboxes
export function ContactPicker({
  selectedIds,
  onToggle,
  excludeIds = [],
}: {
  selectedIds: number[];
  onToggle: (userId: number) => void;
  excludeIds?: number[];
}) {
  const { contacts } = useChat();
  const [query, setQuery] = useState("");
  const search = query.trim().toLowerCase();

  const visible = contacts.filter(
    (contact) =>
      !excludeIds.includes(contact.user.id) &&
      (contact.user.display_name.toLowerCase().includes(search) || contact.user.phone.includes(search)),
  );

  return (
    <>
      <SearchInput value={query} onChange={setQuery} placeholder="Search contacts" />
      {visible.map((contact) => (
        <ContactRow
          key={contact.id}
          user={contact.user}
          onClick={() => onToggle(contact.user.id)}
          right={<RoundCheckbox checked={selectedIds.includes(contact.user.id)} />}
        />
      ))}
      {visible.length === 0 && <p className="py-6 text-center text-sm text-secondary">No contacts found</p>}
    </>
  );
}

// Selected list mein id ho to hata do, warna jod do
export function toggleId(list: number[], id: number) {
  return list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
}
