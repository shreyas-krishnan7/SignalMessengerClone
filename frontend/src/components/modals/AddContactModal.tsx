"use client";

import { useState } from "react";
import { ContactRow } from "@/components/ContactRow";
import { Button, Modal } from "@/components/ui/Modal";
import { textInputClass } from "@/components/ui/misc";
import { useChat } from "@/context/ChatContext";
import { useToast } from "@/context/ToastContext";
import { api } from "@/lib/api";
import type { Contact } from "@/lib/types";

export function AddContactModal({ onClose }: { onClose: () => void }) {
  const { refreshContacts, startDirectChat } = useChat();
  const { showToast } = useToast();
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [added, setAdded] = useState<Contact | null>(null);

  async function addContact(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const contact = await api<Contact>("/api/contacts", { method: "POST", body: { query } });
      await refreshContacts();
      setAdded(contact);
      showToast(`${contact.user.display_name} added to contacts`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't add contact");
    } finally {
      setBusy(false);
    }
  }

  async function message() {
    if (!added) return;
    await startDirectChat(added.user.id).catch(() => showToast("Couldn't open chat"));
    onClose();
  }

  return (
    <Modal title="Add contact" onClose={onClose}>
      {added ? (
        <>
          <ContactRow user={added.user} />
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setAdded(null)}>
              Add another
            </Button>
            <Button onClick={message}>Message</Button>
          </div>
        </>
      ) : (
        <form onSubmit={addContact}>
          <p className="mb-3 text-sm text-secondary">Find people on Signal by their phone number or username.</p>
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="+91 90000 00002 or @username"
            className={textInputClass}
          />
          {error && <p className="mt-2 text-sm text-danger">{error}</p>}
          <div className="mt-4 flex justify-end">
            <Button disabled={!query.trim() || busy}>{busy ? "Searching..." : "Add"}</Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
