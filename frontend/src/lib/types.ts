export type MessageStatus = "sending" | "failed" | "sent" | "delivered" | "read";

export interface User {
  id: number;
  phone: string;
  username: string | null;
  display_name: string;
  about: string;
  avatar_color: string;
  avatar_url: string | null;
  is_online: boolean;
  last_seen_at: string;
}

export interface Member extends User {
  role: "admin" | "member";
}

export interface Reaction {
  user_id: number;
  emoji: string;
}

export interface ReplyPreview {
  id: number;
  sender_id: number;
  sender_name: string;
  type: string;
  body: string;
  attachment_name: string | null;
  is_deleted: boolean;
}

export interface Message {
  id: number;
  conversation_id: number;
  sender_id: number;
  type: "text" | "attachment" | "system";
  body: string;
  attachment_url: string | null;
  attachment_name: string | null;
  attachment_type: string | null;
  reply_to: ReplyPreview | null;
  reactions: Reaction[];
  status: MessageStatus;
  is_deleted: boolean;
  created_at: string;
  expires_at: string | null;
  client_id: string | null;
}

export interface Conversation {
  id: number;
  type: "direct" | "group";
  title: string;
  description: string;
  avatar_color: string;
  avatar_url: string | null;
  members: Member[];
  my_role: "admin" | "member";
  last_message: Message | null;
  unread_count: number;
  disappearing_seconds: number;
  last_message_at: string;
}

export interface Contact {
  id: number;
  user: User;
}

export interface Attachment {
  url: string;
  name: string;
  content_type: string;
}

// Server se WebSocket pe aane wala har event isi shape ka hota hai
export interface ServerEvent {
  type: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any;
}
