"use client";

import { Fragment, useLayoutEffect, useRef, useState } from "react";
import { Info, Lock } from "lucide-react";
import { Avatar, ConversationAvatar } from "@/components/ui/Avatar";
import { Spinner, TypingDots } from "@/components/ui/misc";
import { useAuth } from "@/context/AuthContext";
import { useChat } from "@/context/ChatContext";
import { formatDateSeparator, formatPhone, isSameDay } from "@/lib/format";
import { useMinuteTick } from "@/lib/hooks";
import type { Conversation, Message } from "@/lib/types";
import { MessageBubble } from "./MessageBubble";

const CLUSTER_GAP_MS = 3 * 60 * 1000;

// Same bande ke 3 minute ke andar ke messages ek "cluster" mein judte hain (beech mein naam/avatar repeat nahi)
function sameCluster(a: Message | undefined, b: Message | undefined) {
  if (!a || !b || a.type === "system" || b.type === "system") return false;
  const dateA = new Date(a.created_at);
  const dateB = new Date(b.created_at);
  return (
    a.sender_id === b.sender_id &&
    Math.abs(dateB.getTime() - dateA.getTime()) < CLUSTER_GAP_MS &&
    isSameDay(dateA, dateB)
  );
}

export function MessageList({
  conversation,
  onReply,
  search = "",
}: {
  conversation: Conversation;
  onReply: (m: Message) => void;
  search?: string;
}) {
  const { user } = useAuth();
  const { messages, hasMoreMessages, messagesLoading, loadOlderMessages, typingUserIds } = useChat();
  const [loadingOlder, setLoadingOlder] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const nearBottomRef = useRef(true);
  const heightBeforeOlderLoad = useRef<number | null>(null);
  useMinuteTick();

  const myId = user?.id ?? 0;
  const isGroup = conversation.type === "group";
  const typingIds = typingUserIds(conversation.id);
  const lastMessage = messages[messages.length - 1];

  useLayoutEffect(() => {
    const element = scrollRef.current;
    if (!element) return;
    // Purane messages upar jude hain: scroll position wahi rakho jahan user tha
    if (heightBeforeOlderLoad.current !== null) {
      element.scrollTop = element.scrollHeight - heightBeforeOlderLoad.current;
      heightBeforeOlderLoad.current = null;
      return;
    }
    // Naya message: neeche scroll karo agar user pehle se neeche tha ya message maine bheja
    if (nearBottomRef.current || lastMessage?.sender_id === myId) {
      element.scrollTop = element.scrollHeight;
    }
  }, [messages.length, lastMessage?.id, lastMessage?.sender_id, typingIds.length, myId]);

  async function handleScroll() {
    const element = scrollRef.current;
    if (!element) return;
    nearBottomRef.current = element.scrollHeight - element.scrollTop - element.clientHeight < 120;

    // Sabse upar pahunche to purane messages load karo (infinite scroll)
    if (element.scrollTop < 80 && hasMoreMessages && !loadingOlder) {
      setLoadingOlder(true);
      heightBeforeOlderLoad.current = element.scrollHeight;
      try {
        await loadOlderMessages();
      } catch {
        heightBeforeOlderLoad.current = null;
      } finally {
        setLoadingOlder(false);
      }
    }
  }

  const membersById = new Map(conversation.members.map((m) => [m.id, m]));
  // Chat ke andar search: sirf wo messages dikhao jinke text mein query ho
  const query = search.trim().toLowerCase();
  const visibleMessages = query
    ? messages.filter((m) => m.type !== "system" && !m.is_deleted && m.body.toLowerCase().includes(query))
    : messages;

  return (
    <div ref={scrollRef} onScroll={handleScroll} className="flex-1 overflow-y-auto px-3 pt-2 pb-3 md:px-4">
      {/* Kam messages hon to wo neeche chipke rahein (justify-end) */}
      <div className="flex min-h-full flex-col justify-end">
        {messagesLoading && (
          <div className="flex justify-center py-10">
            <Spinner />
          </div>
        )}

        {loadingOlder && (
          <div className="flex justify-center py-3">
            <Spinner />
          </div>
        )}

        {/* Chat ki shuruaat: bada avatar, naam aur encryption note */}
        {!messagesLoading && !hasMoreMessages && !query && <ConversationHero conversation={conversation} myId={myId} />}
        {query && visibleMessages.length === 0 && (
          <p className="py-10 text-center text-[13px] text-secondary">No messages found for &quot;{search}&quot;</p>
        )}

        {visibleMessages.map((message, index) => {
          const previous = visibleMessages[index - 1];
          const next = visibleMessages[index + 1];
          const showDate = !previous || !isSameDay(new Date(previous.created_at), new Date(message.created_at));

          return (
            <Fragment key={message.client_id ?? message.id}>
              {showDate && (
                <div className="my-4 text-center text-[13px] text-secondary">
                  {formatDateSeparator(message.created_at)}
                </div>
              )}
              {message.type === "system" ? (
                <div className="my-3 flex items-center justify-center gap-1.5 px-6 text-center text-[13px] text-secondary">
                  <Info size={14} className="shrink-0" />
                  {message.body}
                </div>
              ) : (
                <MessageBubble
                  message={message}
                  mine={message.sender_id === myId}
                  myId={myId}
                  isGroup={isGroup}
                  sender={membersById.get(message.sender_id)}
                  isFirstInCluster={!sameCluster(previous, message)}
                  isLastInCluster={!sameCluster(message, next)}
                  onReply={() => onReply(message)}
                />
              )}
            </Fragment>
          );
        })}

        {typingIds.length > 0 && (
          <div className="mt-3 flex items-end gap-2">
            {isGroup && (
              <Avatar
                name={membersById.get(typingIds[0])?.display_name ?? ""}
                color={membersById.get(typingIds[0])?.avatar_color ?? "A100"}
                url={membersById.get(typingIds[0])?.avatar_url}
                size={28}
              />
            )}
            <div className="rounded-[18px] bg-bubble-in px-4 py-3 text-secondary">
              <TypingDots />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ConversationHero({ conversation, myId }: { conversation: Conversation; myId: number }) {
  const other = conversation.members.find((m) => m.id !== myId);
  return (
    // Signal jaisa: gol kono wala outline card, beech mein avatar aur naam
    <div className="flex justify-center px-4 pt-6 pb-2">
      <div className="flex w-full max-w-[256px] flex-col items-center rounded-[28px] border border-selected px-5 pt-4 pb-5 text-center">
        <ConversationAvatar conversation={conversation} myId={myId} size={72} />
        <h3 className="mt-2 text-[20px] leading-6 font-semibold">{conversation.title}</h3>
        {conversation.type === "group" ? (
          <>
            <p className="mt-2 text-[13px]">{conversation.members.length} members</p>
            {conversation.description && <p className="mt-1 text-[13px] text-secondary">{conversation.description}</p>}
          </>
        ) : (
          other && (
            <>
              <p className="mt-2 text-[13px]">
                {other.username ? `@${other.username} · ` : ""}
                {formatPhone(other.phone)}
              </p>
              {other.about && <p className="mt-1 text-[13px] text-secondary">{other.about}</p>}
            </>
          )
        )}
        <p className="mt-2 flex items-center gap-1.5 text-[12px] text-secondary">
          <Lock size={12} className="shrink-0" />
          End-to-end encrypted (simulated)
        </p>
      </div>
    </div>
  );
}
