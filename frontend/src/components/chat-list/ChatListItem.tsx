import { ConversationAvatar } from "@/components/ui/Avatar";
import { StatusIcon } from "@/components/ui/StatusIcon";
import { TypingDots } from "@/components/ui/misc";
import { messagePreview } from "@/lib/chatUtils";
import { firstName, formatListTime } from "@/lib/format";
import type { Conversation } from "@/lib/types";

interface ChatListItemProps {
  conversation: Conversation;
  myId: number;
  active: boolean;
  isTyping: boolean;
  onClick: () => void;
}

export function ChatListItem({ conversation, myId, active, isTyping, onClick }: ChatListItemProps) {
  const last = conversation.last_message;
  const unread = conversation.unread_count;

  // Group mein preview ke aage bhejne wale ka naam: "Priya: hello"
  let prefix = "";
  if (last && conversation.type === "group" && last.type !== "system") {
    const sender = conversation.members.find((m) => m.id === last.sender_id);
    prefix = last.sender_id === myId ? "You: " : sender ? `${firstName(sender.display_name)}: ` : "";
  }
  const preview = last ? prefix + messagePreview(last) : conversation.type === "group" ? "Group created" : "";
  const showStatus = last && last.sender_id === myId && last.type !== "system" && !last.is_deleted;

  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-[10px] px-3 py-2 text-left ${active ? "bg-selected" : "hover:bg-hover"}`}
    >
      <ConversationAvatar conversation={conversation} myId={myId} size={48} showOnline />

      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <span className={`truncate text-[14px] ${unread > 0 ? "font-bold" : "font-semibold"}`}>
            {conversation.title}
          </span>
          {last && (
            <span className="shrink-0 text-[12px] text-secondary">{formatListTime(conversation.last_message_at)}</span>
          )}
        </div>

        <div className="mt-0.5 flex items-center gap-2">
          <p className={`min-w-0 flex-1 truncate text-[13px] ${unread > 0 ? "text-primary" : "text-secondary"}`}>
            {isTyping ? <TypingDots /> : <span className={last?.is_deleted ? "italic" : ""}>{preview}</span>}
          </p>
          {unread > 0 ? (
            <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-accent px-1.5 text-[11px] font-semibold text-white">
              {unread}
            </span>
          ) : (
            showStatus && (
              <span className="shrink-0 text-secondary">
                <StatusIcon status={last.status} checkColor="var(--sidebar)" />
              </span>
            )
          )}
        </div>
      </div>
    </button>
  );
}
