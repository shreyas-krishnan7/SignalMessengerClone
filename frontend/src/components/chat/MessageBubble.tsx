"use client";

import { useState } from "react";
import { Ban, Copy, Download, Ellipsis, FileText, Reply, SmilePlus, Timer, Trash2 } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { ConfirmDialog } from "@/components/ui/Modal";
import { Menu, MenuItem } from "@/components/ui/Menu";
import { StatusIcon } from "@/components/ui/StatusIcon";
import { useChat } from "@/context/ChatContext";
import { useToast } from "@/context/ToastContext";
import { fileUrl } from "@/lib/api";
import { getAvatarColor } from "@/lib/avatarColors";
import { formatMessageTime } from "@/lib/format";
import type { Member, Message } from "@/lib/types";

// Signal ke default reaction emojis
const REACTIONS = ["❤️", "👍", "👎", "😂", "😮", "😢"];

interface MessageBubbleProps {
  message: Message;
  mine: boolean;
  myId: number;
  isGroup: boolean;
  sender: Member | undefined;
  isFirstInCluster: boolean;
  isLastInCluster: boolean;
  onReply: () => void;
}

export function MessageBubble({
  message,
  mine,
  myId,
  isGroup,
  sender,
  isFirstInCluster,
  isLastInCluster,
  onReply,
}: MessageBubbleProps) {
  const { toggleReaction, deleteMessage } = useChat();
  const { showToast } = useToast();
  const [openPopup, setOpenPopup] = useState<"reactions" | "menu" | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const isPending = message.id < 0; // abhi server pe save nahi hua
  const canInteract = !message.is_deleted && !isPending;
  const showSenderInfo = isGroup && !mine;

  // Cluster ke beech wale bubbles ke kone thode kam round (Signal jaisa joda hua look)
  const corners = mine
    ? `${isFirstInCluster ? "" : "rounded-tr-[4px]"} ${isLastInCluster ? "" : "rounded-br-[4px]"}`
    : `${isFirstInCluster ? "" : "rounded-tl-[4px]"} ${isLastInCluster ? "" : "rounded-bl-[4px]"}`;
  const colors = mine ? "bg-accent text-white" : "bg-bubble-in text-primary";

  const isImage = message.attachment_type?.startsWith("image/");
  const reactionGroups = groupReactions(message, myId);

  function copyText() {
    navigator.clipboard.writeText(message.body).then(() => showToast("Copied to clipboard"));
  }

  const actions = canInteract && (
    <div className="relative flex shrink-0 items-center self-center opacity-0 transition-opacity group-hover:opacity-100 has-[.open]:opacity-100">
      <ActionButton label="React" onClick={() => setOpenPopup("reactions")}>
        <SmilePlus size={16} />
      </ActionButton>
      <ActionButton label="Reply" onClick={onReply}>
        <Reply size={16} />
      </ActionButton>
      <ActionButton label="More actions" onClick={() => setOpenPopup("menu")}>
        <Ellipsis size={16} />
      </ActionButton>

      {openPopup === "reactions" && (
        <Menu
          onClose={() => setOpenPopup(null)}
          className={`open bottom-9 flex min-w-0 gap-1 rounded-full px-2 py-1.5 ${mine ? "right-0" : "left-0"}`}
        >
          {REACTIONS.map((emoji) => (
            <button
              key={emoji}
              onClick={() => toggleReaction(message.id, emoji)}
              className="flex h-9 w-9 items-center justify-center rounded-full text-xl transition-transform hover:scale-125 hover:bg-hover"
            >
              {emoji}
            </button>
          ))}
        </Menu>
      )}
      {openPopup === "menu" && (
        <Menu onClose={() => setOpenPopup(null)} className={`open bottom-9 ${mine ? "right-0" : "left-0"}`}>
          <MenuItem icon={<Reply size={16} />} label="Reply" onClick={onReply} />
          {message.body && <MenuItem icon={<Copy size={16} />} label="Copy text" onClick={copyText} />}
          {mine && (
            <MenuItem
              icon={<Trash2 size={16} />}
              label="Delete for everyone"
              danger
              onClick={() => setConfirmDelete(true)}
            />
          )}
        </Menu>
      )}
    </div>
  );

  return (
    <div
      id={`message-${message.id}`}
      className={`group flex items-end gap-2 ${mine ? "justify-end" : "justify-start"} ${
        isFirstInCluster ? "mt-3" : "mt-[3px]"
      } ${reactionGroups.length > 0 ? "mb-4" : ""}`}
    >
      {/* Group mein dusron ke cluster ke last message ke saath avatar */}
      {showSenderInfo &&
        (isLastInCluster ? (
          <Avatar
            name={sender?.display_name ?? ""}
            color={sender?.avatar_color ?? "A210"}
            url={sender?.avatar_url}
            size={28}
          />
        ) : (
          <div className="w-7 shrink-0" />
        ))}

      {mine && actions}

      <div className="relative max-w-[min(78%,520px)]">
        <div className={`flow-root rounded-[18px] px-3 py-2 text-[14px] leading-[20px] ${colors} ${corners}`}>
          {showSenderInfo && isFirstInCluster && (
            // Light theme mein gehra color, dark theme mein halka color (padhne mein aasaan)
            <p
              className="mb-0.5 text-[13px] font-semibold text-(--name-light) dark:text-(--name-dark)"
              style={
                {
                  "--name-light": getAvatarColor(sender?.avatar_color ?? "A210").fg,
                  "--name-dark": getAvatarColor(sender?.avatar_color ?? "A210").bg,
                } as React.CSSProperties
              }
            >
              {sender?.display_name ?? "Former member"}
            </p>
          )}

          {message.is_deleted ? (
            <p className="flex items-center gap-1.5 italic opacity-80">
              <Ban size={14} /> This message was deleted
            </p>
          ) : (
            <>
              {message.reply_to && <QuotedMessage reply={message.reply_to} mine={mine} myId={myId} />}

              {message.attachment_url &&
                (isImage ? (
                  <a
                    href={fileUrl(message.attachment_url)}
                    target="_blank"
                    rel="noreferrer"
                    className="-mx-1.5 mt-0.5 mb-1 block"
                  >
                    <img
                      src={fileUrl(message.attachment_url)}
                      alt={message.attachment_name ?? "Image"}
                      className="max-h-[320px] w-full rounded-xl object-cover"
                    />
                  </a>
                ) : (
                  <a
                    href={fileUrl(message.attachment_url)}
                    target="_blank"
                    rel="noreferrer"
                    download={message.attachment_name ?? undefined}
                    className="my-1 flex items-center gap-3 rounded-xl bg-black/10 p-2 dark:bg-white/10"
                  >
                    <FileText size={28} className="shrink-0" />
                    <span className="min-w-0 flex-1 truncate text-[13px] font-medium">{message.attachment_name}</span>
                    <Download size={16} className="shrink-0" />
                  </a>
                ))}

              {message.body && <span className="break-words whitespace-pre-wrap">{message.body}</span>}
            </>
          )}

          {/* Time + timer + ticks: Signal jaisa sirf cluster ke last bubble mein, text ke saath right side mein float */}
          {isLastInCluster && (
            <span
              className={`float-right mt-1.5 ml-3 flex translate-y-[3px] items-center gap-1 text-[11px] leading-none ${
                mine ? "text-white/70" : "text-secondary"
              }`}
            >
              {message.expires_at && <Timer size={11} />}
              {formatMessageTime(message.created_at)}
              {mine && !message.is_deleted && <StatusIcon status={message.status} checkColor="var(--accent)" />}
            </span>
          )}
        </div>

        {reactionGroups.length > 0 && (
          <div className={`absolute -bottom-4 flex gap-0.5 ${mine ? "right-2" : "left-2"}`}>
            {reactionGroups.map((group) => (
              <button
                key={group.emoji}
                onClick={() => canInteract && toggleReaction(message.id, group.emoji)}
                className={`flex h-6 items-center gap-0.5 rounded-full border-2 border-panel px-1.5 text-[13px] ${
                  group.reactedByMe ? "bg-selected" : "bg-input"
                }`}
              >
                {group.emoji}
                {group.count > 1 && <span className="text-[11px] text-secondary">{group.count}</span>}
              </button>
            ))}
          </div>
        )}
      </div>

      {!mine && actions}

      {confirmDelete && (
        <ConfirmDialog
          title="Delete for everyone?"
          message="This message will be deleted for everyone in the chat."
          confirmLabel="Delete"
          onConfirm={() => deleteMessage(message.id)}
          onClose={() => setConfirmDelete(false)}
        />
      )}
    </div>
  );
}

function ActionButton({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      title={label}
      className="flex h-7 w-7 items-center justify-center rounded-full text-secondary hover:bg-hover hover:text-primary"
    >
      {children}
    </button>
  );
}

// Reply wala chhota quote box bubble ke andar; click karne pe original message tak scroll
function QuotedMessage({
  reply,
  mine,
  myId,
}: {
  reply: NonNullable<Message["reply_to"]>;
  mine: boolean;
  myId: number;
}) {
  function scrollToOriginal() {
    document.getElementById(`message-${reply.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
  }
  const text = reply.is_deleted ? "This message was deleted" : reply.body || reply.attachment_name || "Attachment";

  return (
    <button
      onClick={scrollToOriginal}
      className={`-mx-1 mt-0.5 mb-1.5 block w-[calc(100%+0.5rem)] rounded-lg border-l-4 px-2 py-1 text-left text-[13px] ${
        mine ? "border-white/80 bg-white/20" : "border-accent bg-black/5 dark:bg-white/10"
      }`}
    >
      <p className="font-semibold">{reply.sender_id === myId ? "You" : reply.sender_name}</p>
      <p className="line-clamp-2 opacity-90">{text}</p>
    </button>
  );
}

// [{emoji, count, reactedByMe}] - same emoji wale reactions ek saath
function groupReactions(message: Message, myId: number) {
  const groups: { emoji: string; count: number; reactedByMe: boolean }[] = [];
  for (const reaction of message.reactions) {
    const existing = groups.find((g) => g.emoji === reaction.emoji);
    if (existing) {
      existing.count += 1;
      existing.reactedByMe ||= reaction.user_id === myId;
    } else {
      groups.push({ emoji: reaction.emoji, count: 1, reactedByMe: reaction.user_id === myId });
    }
  }
  return groups;
}
