"use client";

import { useState } from "react";
import { ContactPicker, toggleId } from "@/components/modals/ContactPicker";
import { AvatarPicker } from "@/components/ui/AvatarPicker";
import { Button, Modal } from "@/components/ui/Modal";
import { useChat } from "@/context/ChatContext";
import { useToast } from "@/context/ToastContext";
import { api } from "@/lib/api";
import type { Conversation } from "@/lib/types";

export function AddMembersModal({ conversation, onClose }: { conversation: Conversation; onClose: () => void }) {
  const { upsertConversation } = useChat();
  const { showToast } = useToast();
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [busy, setBusy] = useState(false);

  async function addMembers() {
    setBusy(true);
    try {
      const updated = await api<Conversation>(`/api/conversations/${conversation.id}/members`, {
        method: "POST",
        body: { user_ids: selectedIds },
      });
      upsertConversation(updated);
      showToast(`Added ${selectedIds.length} member${selectedIds.length === 1 ? "" : "s"}`);
      onClose();
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Couldn't add members");
      setBusy(false);
    }
  }

  return (
    <Modal
      title="Add members"
      onClose={onClose}
      footer={
        <Button disabled={selectedIds.length === 0 || busy} onClick={addMembers}>
          {busy ? "Adding..." : `Add${selectedIds.length ? ` (${selectedIds.length})` : ""}`}
        </Button>
      }
    >
      {/* Jo already group mein hain wo list mein nahi dikhenge */}
      <ContactPicker
        selectedIds={selectedIds}
        onToggle={(id) => setSelectedIds(toggleId(selectedIds, id))}
        excludeIds={conversation.members.map((m) => m.id)}
      />
    </Modal>
  );
}

export function EditGroupModal({ conversation, onClose }: { conversation: Conversation; onClose: () => void }) {
  const { upsertConversation } = useChat();
  const { showToast } = useToast();
  const [name, setName] = useState(conversation.title);
  const [description, setDescription] = useState(conversation.description);
  const [avatarUrl, setAvatarUrl] = useState(conversation.avatar_url);
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    try {
      const updated = await api<Conversation>(`/api/conversations/${conversation.id}`, {
        method: "PATCH",
        body: { name: name.trim(), description: description.trim(), avatar_url: avatarUrl },
      });
      upsertConversation(updated);
      onClose();
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Couldn't update group");
      setBusy(false);
    }
  }

  return (
    <Modal
      title="Edit group"
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button disabled={!name.trim() || busy} onClick={save}>
            Save
          </Button>
        </>
      }
    >
      <div className="py-2">
        <AvatarPicker name={name} color={conversation.avatar_color} url={avatarUrl} onChange={setAvatarUrl} isGroup />
      </div>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Group name"
        maxLength={64}
        className="mt-4 w-full rounded-lg bg-input px-3 py-2.5 text-[15px] outline-none focus:ring-2 focus:ring-accent"
      />
      <input
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Description"
        maxLength={255}
        className="mt-3 w-full rounded-lg bg-input px-3 py-2.5 text-[15px] outline-none focus:ring-2 focus:ring-accent"
      />
    </Modal>
  );
}

// Asli Signal identity keys se safety number banata hai. Demo mein dono phone numbers se ek fixed number bana dete hain
function makeSafetyNumber(phoneA: string, phoneB: string) {
  const seed = [phoneA, phoneB].sort().join("|");
  let hash = 7;
  let digits = "";
  for (let i = 0; i < 60; i++) {
    hash = (hash * 31 + seed.charCodeAt(i % seed.length) + i) % 1000003;
    digits += String(hash % 10);
  }
  // 60 digits ko 5-5 ke 12 groups mein todo
  return digits.match(/.{5}/g) ?? [];
}

export function SafetyNumberModal({
  myPhone,
  otherPhone,
  otherName,
  onClose,
}: {
  myPhone: string;
  otherPhone: string;
  otherName: string;
  onClose: () => void;
}) {
  const groups = makeSafetyNumber(myPhone, otherPhone);
  return (
    <Modal title="Safety number" onClose={onClose}>
      <div className="mx-auto grid w-fit grid-cols-4 gap-x-5 gap-y-2 rounded-xl bg-input px-6 py-5 font-mono text-[15px] tracking-wider">
        {groups.map((group, index) => (
          <span key={index}>{group}</span>
        ))}
      </div>
      <p className="mt-4 text-sm text-secondary">
        If you wish to verify the security of your end-to-end encryption with {otherName}, compare the numbers above
        with their device. (Simulated in this demo.)
      </p>
    </Modal>
  );
}
