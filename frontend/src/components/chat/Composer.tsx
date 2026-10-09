"use client";

import { useEffect, useRef, useState } from "react";
import { Mic, Plus, SendHorizontal, Smile, X } from "lucide-react";
import { Menu } from "@/components/ui/Menu";
import { IconButton, Spinner } from "@/components/ui/misc";
import { useAuth } from "@/context/AuthContext";
import { useChat } from "@/context/ChatContext";
import { useToast } from "@/context/ToastContext";
import { uploadFile } from "@/lib/api";
import type { Conversation, Message } from "@/lib/types";

const EMOJIS = (
  "😀 😃 😄 😁 😆 😅 😂 🤣 😊 😇 🙂 😉 😍 🥰 😘 😋 😛 😜 🤪 😎 🤩 🥳 😏 😒 😔 😢 😭 😤 😡 🤯 😳 🥺 " +
  "😱 🤔 🤗 🤭 🙄 😴 👍 👎 👏 🙌 🙏 💪 👋 🤝 ❤️ 🧡 💛 💚 💙 💜 🖤 💯 🔥 ✨ 🎉 🎂 ☕ 🍕 ⚽ 🏏 ✈️ 🏔️"
).split(" ");

interface ComposerProps {
  conversation: Conversation;
  replyTo: Message | null;
  onCancelReply: () => void;
}

export function Composer({ conversation, replyTo, onCancelReply }: ComposerProps) {
  const { user } = useAuth();
  const { sendMessage, sendTyping } = useChat();
  const { showToast } = useToast();
  const [text, setText] = useState("");
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Typing event kab bheja tha, aur "typing band" bhejne ka timer
  const typingRef = useRef<{ lastSentAt: number; stopTimer?: ReturnType<typeof setTimeout> }>({ lastSentAt: 0 });

  // Chat khulte hi ya reply select karte hi input pe focus
  useEffect(() => {
    textareaRef.current?.focus();
  }, [conversation.id, replyTo]);

  function resizeTextarea() {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 144)}px`;
  }

  function stopTyping() {
    clearTimeout(typingRef.current.stopTimer);
    if (typingRef.current.lastSentAt) {
      sendTyping(false);
      typingRef.current.lastSentAt = 0;
    }
  }

  function handleChange(value: string) {
    setText(value);
    resizeTextarea();
    if (!value.trim()) return stopTyping();

    // Har 3 second mein ek "typing" event bhejo (har key pe nahi), aur 3 sec ruk gaye to "stop"
    const now = Date.now();
    if (now - typingRef.current.lastSentAt > 3000) {
      sendTyping(true);
      typingRef.current.lastSentAt = now;
    }
    clearTimeout(typingRef.current.stopTimer);
    typingRef.current.stopTimer = setTimeout(stopTyping, 3000);
  }

  function resetComposer() {
    setText("");
    onCancelReply();
    stopTyping();
    requestAnimationFrame(resizeTextarea);
  }

  function send() {
    const body = text.trim();
    if (!body) return;
    sendMessage(body, { replyTo });
    resetComposer();
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    // Enter = send, Shift+Enter = nayi line
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      send();
    }
  }

  async function handleFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setUploading(true);
    try {
      const attachment = await uploadFile(file);
      // Input mein jo text likha hai wo attachment ka caption ban jata hai
      await sendMessage(text.trim(), { replyTo, attachment });
      resetComposer();
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  const replyAuthor =
    replyTo &&
    (replyTo.sender_id === user?.id
      ? "You"
      : conversation.members.find((m) => m.id === replyTo.sender_id)?.display_name);

  return (
    // Signal jaisa: emoji button bahar left mein, beech mein gol pill input, right mein mic/send aur "+"
    <div className="shrink-0 px-3 pt-1 pb-2.5 md:px-4">
      <div className="flex items-end gap-1.5">
        <div className="relative mb-px">
          <IconButton label="Emoji" onClick={() => setEmojiOpen(true)}>
            <Smile size={20} />
          </IconButton>
          {emojiOpen && (
            <Menu
              onClose={() => setEmojiOpen(false)}
              className="bottom-11 left-0 grid w-[296px] grid-cols-8 gap-0.5 p-2"
            >
              {EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => {
                    handleChange(text + emoji);
                    textareaRef.current?.focus();
                  }}
                  className="flex h-8 w-8 items-center justify-center rounded-md text-xl hover:bg-hover"
                >
                  {emoji}
                </button>
              ))}
            </Menu>
          )}
        </div>

        <div className="relative min-w-0 flex-1 rounded-[18px] bg-input">
          {replyTo && (
            <div className="mx-2 mt-2 flex items-start gap-2 rounded-xl border-l-4 border-accent bg-panel/70 px-3 py-1.5">
              <div className="min-w-0 flex-1 text-[13px]">
                <p className="font-semibold">{replyAuthor}</p>
                <p className="truncate text-secondary">{replyTo.body || replyTo.attachment_name}</p>
              </div>
              <button onClick={onCancelReply} className="text-secondary hover:text-primary" aria-label="Cancel reply">
                <X size={16} />
              </button>
            </div>
          )}

          <textarea
            ref={textareaRef}
            rows={1}
            value={text}
            onChange={(e) => handleChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Message"
            className="block max-h-36 w-full resize-none bg-transparent px-3 py-[7px] text-[14px] leading-5 outline-none placeholder:text-secondary"
          />
        </div>

        {/* Text likha ho to send button, warna mic (voice notes abhi placeholder) */}
        <div className="mb-px flex items-center gap-1">
          {text.trim() ? (
            <button
              onClick={send}
              aria-label="Send"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent text-white hover:bg-accent-hover"
            >
              <SendHorizontal size={16} />
            </button>
          ) : (
            <IconButton label="Voice message" onClick={() => showToast("Voice messages are coming soon")}>
              <Mic size={20} />
            </IconButton>
          )}
          <IconButton label="Attach file" disabled={uploading} onClick={() => fileInputRef.current?.click()}>
            {uploading ? <Spinner /> : <Plus size={22} />}
          </IconButton>
          <input ref={fileInputRef} type="file" hidden onChange={handleFile} />
        </div>
      </div>
    </div>
  );
}
