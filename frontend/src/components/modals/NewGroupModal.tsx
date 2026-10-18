"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { AvatarPicker } from "@/components/ui/AvatarPicker";
import { Button, Modal } from "@/components/ui/Modal";
import { textInputClass } from "@/components/ui/misc";
import { useChat } from "@/context/ChatContext";
import { useToast } from "@/context/ToastContext";
import { api } from "@/lib/api";
import type { Conversation } from "@/lib/types";
import { ContactPicker, toggleId } from "./ContactPicker";

// 2 steps: pehle members chuno, phir group ka naam
export function NewGroupModal({ onClose }: { onClose: () => void }) {
  const { contacts, upsertConversation, openConversation } = useChat();
  const { showToast } = useToast();
  const [step, setStep] = useState<"members" | "details">("members");
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const selectedUsers = contacts.filter((c) => selectedIds.includes(c.user.id)).map((c) => c.user);

  async function createGroup() {
    setBusy(true);
    try {
      const conversation = await api<Conversation>("/api/conversations/group", {
        method: "POST",
        body: { name: name.trim(), description: description.trim(), member_ids: selectedIds, avatar_url: avatarUrl },
      });
      upsertConversation(conversation);
      openConversation(conversation.id);
      onClose();
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Couldn't create group");
      setBusy(false);
    }
  }

  if (step === "details") {
    return (
      <Modal
        title="Name this group"
        onClose={onClose}
        footer={
          <>
            <Button variant="secondary" onClick={() => setStep("members")}>
              Back
            </Button>
            <Button disabled={!name.trim() || busy} onClick={createGroup}>
              {busy ? "Creating..." : "Create"}
            </Button>
          </>
        }
      >
        <div className="py-2">
          <AvatarPicker name={name} color="A140" url={avatarUrl} onChange={setAvatarUrl} isGroup />
        </div>
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Group name (required)"
          maxLength={64}
          className={`mt-4 ${textInputClass}`}
        />
        <input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Description (optional)"
          maxLength={255}
          className={`mt-3 ${textInputClass}`}
        />
        <p className="mt-4 text-[13px] text-secondary">
          {selectedUsers.length} member{selectedUsers.length === 1 ? "" : "s"}:{" "}
          {selectedUsers.map((u) => u.display_name).join(", ")}
        </p>
      </Modal>
    );
  }

  return (
    <Modal
      title="Add members"
      onClose={onClose}
      footer={
        <Button disabled={selectedIds.length === 0} onClick={() => setStep("details")}>
          Next
        </Button>
      }
    >
      {/* Chune hue members ke chips */}
      {selectedUsers.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {selectedUsers.map((user) => (
            <button
              key={user.id}
              onClick={() => setSelectedIds(toggleId(selectedIds, user.id))}
              className="flex items-center gap-1 rounded-full bg-input py-1 pr-2 pl-3 text-[13px] hover:bg-selected"
            >
              {user.display_name} <X size={14} />
            </button>
          ))}
        </div>
      )}
      <ContactPicker selectedIds={selectedIds} onToggle={(id) => setSelectedIds(toggleId(selectedIds, id))} />
    </Modal>
  );
}
