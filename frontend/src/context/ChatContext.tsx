"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { api, getToken, WS_URL } from "@/lib/api";
import { higherStatus, messagePreview, sortConversations, upsertMessage } from "@/lib/chatUtils";
import type { Attachment, Contact, Conversation, Message, MessageStatus, ServerEvent, User } from "@/lib/types";
import { useAuth } from "./AuthContext";
import { useSettings } from "./SettingsContext";
import { useToast } from "./ToastContext";

const PAGE_SIZE = 50;

interface SendOptions {
  replyTo?: Message | null;
  attachment?: Attachment | null;
}

interface ChatValue {
  conversations: Conversation[];
  contacts: Contact[];
  activeConversation: Conversation | null;
  messages: Message[];
  hasMoreMessages: boolean;
  messagesLoading: boolean;
  typingUserIds: (conversationId: number) => number[];
  openConversation: (id: number | null) => void;
  loadOlderMessages: () => Promise<void>;
  sendMessage: (body: string, options?: SendOptions) => Promise<void>;
  toggleReaction: (messageId: number, emoji: string) => Promise<void>;
  deleteMessage: (messageId: number) => Promise<void>;
  sendTyping: (isTyping: boolean) => void;
  upsertConversation: (conversation: Conversation) => void;
  startDirectChat: (userId: number) => Promise<void>;
  markAllRead: () => void;
  refreshContacts: () => Promise<void>;
}

const ChatContext = createContext<ChatValue | null>(null);

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const { showToast } = useToast();
  const { notifications, typingIndicators } = useSettings();
  const myId = user?.id ?? 0;

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  // Har conversation ke messages alag cache mein: { conversationId: Message[] }
  const [messagesByConv, setMessagesByConv] = useState<Record<number, Message[]>>({});
  const [hasMoreByConv, setHasMoreByConv] = useState<Record<number, boolean>>({});
  const [activeId, setActiveId] = useState<number | null>(null);
  // Kaun kaun type kar raha hai: { conversationId: [userIds] }
  const [typingByConv, setTypingByConv] = useState<Record<number, number[]>>({});

  const socketRef = useRef<WebSocket | null>(null);
  const activeIdRef = useRef<number | null>(null);
  const typingTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const loadingOlderRef = useRef(false);

  const activeConversation = conversations.find((c) => c.id === activeId) ?? null;

  // ---------- Chhote helpers ----------

  function updateConversation(id: number, change: (c: Conversation) => Conversation) {
    setConversations((list) => sortConversations(list.map((c) => (c.id === id ? change(c) : c))));
  }

  const upsertConversation = useCallback((conversation: Conversation) => {
    setConversations((list) => sortConversations([...list.filter((c) => c.id !== conversation.id), conversation]));
  }, []);

  // Sirf un conversations ke messages update karo jo already load ho chuke hain
  function changeMessages(conversationId: number, change: (list: Message[]) => Message[]) {
    setMessagesByConv((all) => (all[conversationId] ? { ...all, [conversationId]: change(all[conversationId]) } : all));
  }

  async function fetchConversation(id: number) {
    upsertConversation(await api<Conversation>(`/api/conversations/${id}`));
  }

  const refreshConversations = useCallback(async () => {
    const list = await api<Conversation[]>("/api/conversations");
    setConversations((current) => {
      // Nayi khaali 1:1 chat server list mein nahi aati, agar wo khuli hai to usko rakh lo
      const active = current.find((c) => c.id === activeIdRef.current);
      const keepActive = active && !list.some((c) => c.id === active.id);
      return sortConversations(keepActive ? [...list, active] : list);
    });
  }, []);

  const refreshContacts = useCallback(async () => {
    setContacts(await api<Contact[]>("/api/contacts"));
  }, []);

  const loadMessages = useCallback(async (conversationId: number) => {
    const list = await api<Message[]>(`/api/conversations/${conversationId}/messages?limit=${PAGE_SIZE}`);
    setMessagesByConv((all) => ({ ...all, [conversationId]: list }));
    setHasMoreByConv((all) => ({ ...all, [conversationId]: list.length === PAGE_SIZE }));
  }, []);

  function markRead(conversationId: number) {
    updateConversation(conversationId, (c) => ({ ...c, unread_count: 0 }));
    api(`/api/conversations/${conversationId}/read`, { method: "POST" }).catch(() => null);
  }

  function setTypingFor(conversationId: number, userId: number, isTyping: boolean) {
    const key = `${conversationId}:${userId}`;
    clearTimeout(typingTimers.current[key]);
    setTypingByConv((all) => {
      const others = (all[conversationId] ?? []).filter((id) => id !== userId);
      return { ...all, [conversationId]: isTyping ? [...others, userId] : others };
    });
    // "Typing band" wala event miss ho jaye to 6 second baad khud hata do
    if (isTyping) typingTimers.current[key] = setTimeout(() => setTypingFor(conversationId, userId, false), 6000);
  }

  // ---------- WebSocket events ----------

  function handleNewMessage(message: Message) {
    const conversationId = message.conversation_id;
    const fromMe = message.sender_id === myId;
    changeMessages(conversationId, (list) => upsertMessage(list, message));
    setTypingFor(conversationId, message.sender_id, false);

    const conversation = conversations.find((c) => c.id === conversationId);
    if (!conversation) {
      // Kisi ne nayi chat shuru ki hai, poori conversation le aao
      fetchConversation(conversationId).catch(() => null);
      return;
    }

    const isOpen = conversationId === activeIdRef.current;
    const countsAsUnread = !fromMe && !isOpen && message.type !== "system";
    updateConversation(conversationId, (c) => ({
      ...c,
      last_message: message,
      last_message_at: message.created_at,
      unread_count: c.unread_count + (countsAsUnread ? 1 : 0),
    }));

    // Chat already khuli hai to turant read mark kar do (sender ko blue ticks dikhenge)
    if (!fromMe && isOpen) markRead(conversationId);

    if (countsAsUnread && notifications) {
      const sender = conversation.members.find((m) => m.id === message.sender_id);
      const from =
        conversation.type === "group" ? `${sender?.display_name} in ${conversation.title}` : sender?.display_name;
      showToast(`${from}: ${messagePreview(message)}`, () => openConversation(conversationId));
    }
  }

  function handleUpdatedMessage(message: Message) {
    changeMessages(message.conversation_id, (list) => upsertMessage(list, message));
    updateConversation(message.conversation_id, (c) =>
      c.last_message?.id === message.id ? { ...c, last_message: message } : c,
    );
  }

  function handleDeletedMessage(conversationId: number, messageId: number) {
    changeMessages(conversationId, (list) => list.filter((m) => m.id !== messageId));
    const conversation = conversations.find((c) => c.id === conversationId);
    // Last message hi gayab hua to list ka preview update karne ke liye conversation dobara lao
    if (conversation?.last_message?.id === messageId) fetchConversation(conversationId).catch(() => null);
  }

  function handleStatusUpdates(updates: { message_id: number; conversation_id: number; status: MessageStatus }[]) {
    for (const update of updates) {
      const applyStatus = (m: Message) =>
        m.id === update.message_id ? { ...m, status: higherStatus(m.status, update.status) } : m;
      changeMessages(update.conversation_id, (list) => list.map(applyStatus));
      updateConversation(update.conversation_id, (c) =>
        c.last_message ? { ...c, last_message: applyStatus(c.last_message) } : c,
      );
    }
  }

  function handlePresence(userId: number, isOnline: boolean, lastSeenAt: string) {
    const applyPresence = <T extends User>(u: T): T =>
      u.id === userId ? { ...u, is_online: isOnline, last_seen_at: lastSeenAt } : u;
    setConversations((list) => list.map((c) => ({ ...c, members: c.members.map(applyPresence) })));
    setContacts((list) => list.map((contact) => ({ ...contact, user: applyPresence(contact.user) })));
  }

  function handleRemovedFromConversation(conversationId: number) {
    setConversations((list) => list.filter((c) => c.id !== conversationId));
    if (activeIdRef.current === conversationId) {
      activeIdRef.current = null;
      setActiveId(null);
    }
  }

  function handleServerEvent({ type, data }: ServerEvent) {
    switch (type) {
      case "message.new":
        return handleNewMessage(data);
      case "message.updated":
        return handleUpdatedMessage(data);
      case "message.deleted":
        return handleDeletedMessage(data.conversation_id, data.message_id);
      case "message.status":
        return handleStatusUpdates(data.updates);
      case "typing":
        if (typingIndicators) setTypingFor(data.conversation_id, data.user_id, data.is_typing);
        return;
      case "presence":
        return handlePresence(data.user_id, data.is_online, data.last_seen_at);
      case "user.updated":
        // Kisi ne naam/photo badla: list aur contacts refresh kar lo
        refreshConversations().catch(() => null);
        refreshContacts().catch(() => null);
        return;
      case "conversation.updated":
        fetchConversation(data.conversation_id).catch(() => null);
        return;
      case "conversation.removed":
        return handleRemovedFromConversation(data.conversation_id);
    }
  }

  // WebSocket callback purane render ka function pakad ke rakhta hai,
  // isliye ref mein hamesha latest handler rakhte hain taaki latest state mile
  const handleEventRef = useRef(handleServerEvent);
  useEffect(() => {
    handleEventRef.current = handleServerEvent;
  });

  // Login hote hi pehli baar data load karo
  useEffect(() => {
    if (!myId) return;
    refreshConversations().catch(() => showToast("Couldn't load chats"));
    refreshContacts().catch(() => null);
  }, [myId, refreshConversations, refreshContacts, showToast]);

  // WebSocket connect karo, connection toote to 2 second baad dobara try karo
  useEffect(() => {
    if (!myId) return;
    let stopped = false;
    let connectedBefore = false;
    let retryTimer: ReturnType<typeof setTimeout>;

    function connect() {
      const socket = new WebSocket(`${WS_URL}/ws?token=${getToken()}`);
      socketRef.current = socket;

      socket.onopen = () => {
        // Reconnect hua hai to beech mein miss hue events ki jagah fresh data le aao
        if (connectedBefore) {
          refreshConversations().catch(() => null);
          setMessagesByConv({});
          if (activeIdRef.current) loadMessages(activeIdRef.current).catch(() => null);
        }
        connectedBefore = true;
      };
      socket.onmessage = (event) => handleEventRef.current(JSON.parse(event.data));
      socket.onclose = (event) => {
        if (event.code === 4401) {
          logout(); // Token invalid ho gaya
          return;
        }
        if (!stopped) retryTimer = setTimeout(connect, 2000);
      };
    }

    connect();
    return () => {
      stopped = true;
      clearTimeout(retryTimer);
      socketRef.current?.close();
    };
  }, [myId, logout, refreshConversations, loadMessages]);

  // Browser tab ke title mein unread count: "Signal (3)"
  const totalUnread = conversations.reduce((sum, c) => sum + c.unread_count, 0);
  useEffect(() => {
    document.title = totalUnread > 0 ? `Signal (${totalUnread})` : "Signal";
  }, [totalUnread]);

  // ---------- Actions jo components call karte hain ----------

  function openConversation(id: number | null) {
    activeIdRef.current = id;
    setActiveId(id);
    if (id === null) return;
    if (!messagesByConv[id]) loadMessages(id).catch(() => showToast("Couldn't load messages"));
    const conversation = conversations.find((c) => c.id === id);
    if (conversation && conversation.unread_count > 0) markRead(id);
  }

  async function loadOlderMessages() {
    if (!activeId || loadingOlderRef.current) return;
    const oldest = (messagesByConv[activeId] ?? []).find((m) => m.id > 0);
    if (!oldest) return;

    loadingOlderRef.current = true;
    try {
      const older = await api<Message[]>(
        `/api/conversations/${activeId}/messages?limit=${PAGE_SIZE}&before_id=${oldest.id}`,
      );
      setMessagesByConv((all) => ({ ...all, [activeId]: [...older, ...(all[activeId] ?? [])] }));
      setHasMoreByConv((all) => ({ ...all, [activeId]: older.length === PAGE_SIZE }));
    } finally {
      loadingOlderRef.current = false;
    }
  }

  async function sendMessage(body: string, { replyTo = null, attachment = null }: SendOptions = {}) {
    if (!activeConversation || !user) return;
    const conversationId = activeConversation.id;
    const clientId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const attachmentFields = {
      attachment_url: attachment?.url ?? null,
      attachment_name: attachment?.name ?? null,
      attachment_type: attachment?.content_type ?? null,
    };

    // Optimistic UI: server ke jawab se pehle hi message "sending" status ke saath dikha do
    const tempMessage: Message = {
      id: -Date.now(),
      conversation_id: conversationId,
      sender_id: user.id,
      type: attachment ? "attachment" : "text",
      body,
      ...attachmentFields,
      reply_to: replyTo
        ? {
            id: replyTo.id,
            sender_id: replyTo.sender_id,
            sender_name: activeConversation.members.find((m) => m.id === replyTo.sender_id)?.display_name ?? "",
            type: replyTo.type,
            body: replyTo.body,
            attachment_name: replyTo.attachment_name,
            is_deleted: replyTo.is_deleted,
          }
        : null,
      reactions: [],
      status: "sending",
      is_deleted: false,
      created_at: new Date().toISOString(),
      expires_at: null,
      client_id: clientId,
    };
    changeMessages(conversationId, (list) => [...list, tempMessage]);
    updateConversation(conversationId, (c) => ({
      ...c,
      last_message: tempMessage,
      last_message_at: tempMessage.created_at,
    }));

    try {
      const saved = await api<Message>(`/api/conversations/${conversationId}/messages`, {
        method: "POST",
        body: { body, reply_to_id: replyTo?.id ?? null, ...attachmentFields, client_id: clientId },
      });
      changeMessages(conversationId, (list) => upsertMessage(list, saved));
      updateConversation(conversationId, (c) =>
        c.last_message?.client_id === clientId ? { ...c, last_message: saved } : c,
      );
    } catch (error) {
      changeMessages(conversationId, (list) =>
        list.map((m) => (m.client_id === clientId ? { ...m, status: "failed" } : m)),
      );
      showToast(error instanceof Error ? error.message : "Message failed to send");
    }
  }

  // Reaction / delete: server updated message wapas deta hai, usko list mein laga do
  async function updateMessageOnServer(request: Promise<Message>, failText: string) {
    try {
      handleUpdatedMessage(await request);
    } catch (error) {
      showToast(error instanceof Error ? error.message : failText);
    }
  }

  function toggleReaction(messageId: number, emoji: string) {
    const request = api<Message>(`/api/messages/${messageId}/reactions`, { method: "POST", body: { emoji } });
    return updateMessageOnServer(request, "Couldn't react");
  }

  function deleteMessage(messageId: number) {
    return updateMessageOnServer(
      api<Message>(`/api/messages/${messageId}`, { method: "DELETE" }),
      "Couldn't delete message",
    );
  }

  function sendTyping(isTyping: boolean) {
    const socket = socketRef.current;
    if (!typingIndicators || !activeId || socket?.readyState !== WebSocket.OPEN) return;
    socket.send(JSON.stringify({ type: "typing", conversation_id: activeId, is_typing: isTyping }));
  }

  async function startDirectChat(userId: number) {
    const conversation = await api<Conversation>("/api/conversations/direct", {
      method: "POST",
      body: { user_id: userId },
    });
    upsertConversation(conversation);
    openConversation(conversation.id);
  }

  function markAllRead() {
    conversations.filter((c) => c.unread_count > 0).forEach((c) => markRead(c.id));
  }

  const value: ChatValue = {
    conversations,
    contacts,
    activeConversation,
    messages: activeId ? (messagesByConv[activeId] ?? []) : [],
    hasMoreMessages: activeId ? (hasMoreByConv[activeId] ?? false) : false,
    messagesLoading: activeId !== null && !messagesByConv[activeId],
    typingUserIds: (conversationId) => typingByConv[conversationId] ?? [],
    openConversation,
    loadOlderMessages,
    sendMessage,
    toggleReaction,
    deleteMessage,
    sendTyping,
    upsertConversation,
    startDirectChat,
    markAllRead,
    refreshContacts,
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export function useChat() {
  const value = useContext(ChatContext);
  if (!value) throw new Error("useChat must be used inside ChatProvider");
  return value;
}
