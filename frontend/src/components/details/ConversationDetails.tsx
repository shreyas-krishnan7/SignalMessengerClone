"use client";

import { useState } from "react";
import { BellOff, ChevronLeft, LogOut, Pencil, Phone, ShieldCheck, Timer, UserPlus, Video } from "lucide-react";
import { ContactRow } from "@/components/ContactRow";
import { ConversationAvatar } from "@/components/ui/Avatar";
import { ConfirmDialog } from "@/components/ui/Modal";
import { Menu, MenuItem } from "@/components/ui/Menu";
import { IconButton, ListRow } from "@/components/ui/misc";
import { useAuth } from "@/context/AuthContext";
import { useChat } from "@/context/ChatContext";
import { useToast } from "@/context/ToastContext";
import { api } from "@/lib/api";
import { DISAPPEARING_OPTIONS, formatPhone } from "@/lib/format";
import type { Conversation, Member } from "@/lib/types";
import { AddMembersModal, EditGroupModal, SafetyNumberModal } from "./GroupModals";

type DetailsModal = "add-members" | "edit-group" | "leave" | "safety-number" | null;

export function ConversationDetails({ conversation, onBack }: { conversation: Conversation; onBack: () => void }) {
  const { user } = useAuth();
  const { upsertConversation, startDirectChat } = useChat();
  const { showToast } = useToast();
  const [modal, setModal] = useState<DetailsModal>(null);
  const [memberMenuId, setMemberMenuId] = useState<number | null>(null);

  const myId = user?.id ?? 0;
  const isGroup = conversation.type === "group";
  const isAdmin = conversation.my_role === "admin";
  const other = conversation.members.find((m) => m.id !== myId);

  // Admin pehle, phir naam ke order mein; "You" sabse upar
  const members = [...conversation.members].sort((a, b) => {
    if (a.id === myId) return -1;
    if (b.id === myId) return 1;
    if (a.role !== b.role) return a.role === "admin" ? -1 : 1;
    return a.display_name.localeCompare(b.display_name);
  });

  async function request(path: string, method: "PATCH" | "DELETE", body?: unknown) {
    try {
      const result = await api<Conversation | { ok: boolean }>(path, { method, body });
      if ("id" in result) upsertConversation(result);
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Something went wrong");
    }
  }

  function setDisappearing(seconds: number) {
    request(`/api/conversations/${conversation.id}`, "PATCH", { disappearing_seconds: seconds });
  }

  function removeMember(member: Member) {
    request(`/api/conversations/${conversation.id}/members/${member.id}`, "DELETE");
  }

  function setRole(member: Member, role: "admin" | "member") {
    request(`/api/conversations/${conversation.id}/members/${member.id}`, "PATCH", { role });
  }

  function leaveGroup() {
    // Server "conversation.removed" event bhejega, jisse chat list se hat jayegi
    request(`/api/conversations/${conversation.id}/members/${myId}`, "DELETE");
  }

  const comingSoon = (feature: string) => () => showToast(`${feature} is coming soon`);

  return (
    <section className="flex min-w-0 flex-1 flex-col bg-panel">
      {/* Signal mein yahan sirf back arrow hota hai, title nahi */}
      <header className="flex h-[52px] shrink-0 items-center px-3">
        <IconButton label="Back" onClick={onBack}>
          <ChevronLeft size={20} />
        </IconButton>
      </header>

      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-[560px] px-4 pb-8">
          <div className="flex flex-col items-center text-center">
            <ConversationAvatar conversation={conversation} myId={myId} size={80} />
            <h3 className="mt-3 text-[24px]">{conversation.title}</h3>
            {isGroup ? (
              <p className="text-sm text-secondary">Group · {conversation.members.length} members</p>
            ) : (
              <p className="text-sm text-secondary">
                {other?.username ? `@${other.username} · ` : ""}
                {other && formatPhone(other.phone)}
              </p>
            )}
            {(isGroup ? conversation.description : other?.about) && (
              <p className="mt-1 text-sm text-secondary">{isGroup ? conversation.description : other?.about}</p>
            )}
          </div>

          <div className="mt-5 flex justify-center gap-3">
            {[
              { icon: <Video size={18} />, label: "Video", onClick: comingSoon("Video calls") },
              { icon: <Phone size={16} />, label: "Audio", onClick: comingSoon("Voice calls") },
              { icon: <BellOff size={16} />, label: "Mute", onClick: comingSoon("Muting") },
            ].map((action) => (
              <button
                key={action.label}
                onClick={action.onClick}
                className="group flex flex-col items-center gap-1.5 text-[12px]"
              >
                {/* Signal jaisa chhota gol-kono button, label uske neeche */}
                <span className="flex h-7 w-12 items-center justify-center rounded-lg bg-card group-hover:bg-selected">
                  {action.icon}
                </span>
                {action.label}
              </button>
            ))}
          </div>

          <div className="mt-6 rounded-xl bg-card p-1.5">
            <ListRow
              icon={<Timer size={20} />}
              label="Disappearing messages"
              right={
                <select
                  value={conversation.disappearing_seconds}
                  onChange={(e) => setDisappearing(Number(e.target.value))}
                  onClick={(e) => e.stopPropagation()}
                  className="rounded-full bg-selected px-3 py-1 text-[13px] font-semibold outline-none"
                >
                  {DISAPPEARING_OPTIONS.map((option) => (
                    <option key={option.seconds} value={option.seconds}>
                      {option.label}
                    </option>
                  ))}
                </select>
              }
            />
            {isGroup && isAdmin && (
              <ListRow icon={<Pencil size={20} />} label="Edit group" onClick={() => setModal("edit-group")} />
            )}
            {!isGroup && (
              <ListRow
                icon={<ShieldCheck size={20} />}
                label="View safety number"
                onClick={() => setModal("safety-number")}
              />
            )}
          </div>

          {isGroup && (
            <div className="mt-4 rounded-xl bg-card p-1.5">
              <p className="px-3 pt-1 pb-1 text-[14px] font-semibold">{conversation.members.length} members</p>
              {isAdmin && (
                <ListRow icon={<UserPlus size={20} />} label="Add members" onClick={() => setModal("add-members")} />
              )}

              {members.map((member) => (
                <div key={member.id} className="relative">
                  <ContactRow
                    user={member}
                    name={member.id === myId ? "You" : undefined}
                    onClick={() => member.id !== myId && setMemberMenuId(member.id)}
                    right={member.role === "admin" && <span className="text-xs text-secondary">Admin</span>}
                  />
                  {memberMenuId === member.id && (
                    <Menu onClose={() => setMemberMenuId(null)} className="top-12 right-2">
                      <MenuItem label={`Message ${member.display_name}`} onClick={() => startDirectChat(member.id)} />
                      {isAdmin && (
                        <MenuItem
                          label={member.role === "admin" ? "Remove as admin" : "Make group admin"}
                          onClick={() => setRole(member, member.role === "admin" ? "member" : "admin")}
                        />
                      )}
                      {isAdmin && <MenuItem label="Remove from group" danger onClick={() => removeMember(member)} />}
                    </Menu>
                  )}
                </div>
              ))}
            </div>
          )}

          {isGroup && (
            <div className="mt-4 rounded-xl bg-card p-1.5">
              <ListRow icon={<LogOut size={20} />} label="Leave group" danger onClick={() => setModal("leave")} />
            </div>
          )}
        </div>
      </div>

      {modal === "add-members" && <AddMembersModal conversation={conversation} onClose={() => setModal(null)} />}
      {modal === "edit-group" && <EditGroupModal conversation={conversation} onClose={() => setModal(null)} />}
      {modal === "safety-number" && user && other && (
        <SafetyNumberModal
          myPhone={user.phone}
          otherPhone={other.phone}
          otherName={other.display_name}
          onClose={() => setModal(null)}
        />
      )}
      {modal === "leave" && (
        <ConfirmDialog
          title="Leave group?"
          message="You will no longer be able to send or receive messages in this group."
          confirmLabel="Leave"
          onConfirm={leaveGroup}
          onClose={() => setModal(null)}
        />
      )}
    </section>
  );
}
