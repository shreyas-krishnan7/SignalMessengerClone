import type { Conversation, Message, MessageStatus, User } from "./types";

const STATUS_RANK: Record<MessageStatus, number> = { sending: 0, failed: 0, sent: 1, delivered: 2, read: 3 };

// Status sirf aage badhna chahiye (read ke baad late "delivered" event aaye to ignore)
export function higherStatus(current: MessageStatus, incoming: MessageStatus): MessageStatus {
  return STATUS_RANK[incoming] >= STATUS_RANK[current] ? incoming : current;
}

export function sortConversations(list: Conversation[]) {
  return [...list].sort((a, b) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime());
}

// Message list mein add ya replace: same id, ya same client_id (optimistic temp message) ho to replace
export function upsertMessage(list: Message[], message: Message): Message[] {
  const index = list.findIndex(
    (m) => m.id === message.id || (message.client_id !== null && m.client_id === message.client_id),
  );
  if (index === -1) return [...list, message];
  const copy = [...list];
  copy[index] = { ...message, status: higherStatus(list[index].status, message.status) };
  return copy;
}

// Search: naam, username ya phone number mein query ho to match (query lowercase honi chahiye)
export function userMatches(user: User, query: string) {
  return (
    user.display_name.toLowerCase().includes(query) ||
    (user.username ?? "").includes(query) ||
    user.phone.includes(query)
  );
}

// Last message ka chhota preview text (chat list ke liye)
export function messagePreview(message: Message) {
  if (message.is_deleted) return "This message was deleted";
  if (message.type === "attachment") {
    const isImage = message.attachment_type?.startsWith("image/");
    return (
      (isImage ? "📷 Photo" : `📎 ${message.attachment_name ?? "File"}`) + (message.body ? ` · ${message.body}` : "")
    );
  }
  return message.body;
}
