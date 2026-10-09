import { User as UserIcon, Users } from "lucide-react";
import { fileUrl } from "@/lib/api";
import { getAvatarColor } from "@/lib/avatarColors";
import { getInitials } from "@/lib/format";
import type { Conversation } from "@/lib/types";

interface AvatarProps {
  name: string;
  color: string;
  url?: string | null;
  size?: number;
  isGroup?: boolean;
  online?: boolean;
}

export function Avatar({ name, color, url, size = 48, isGroup = false, online = false }: AvatarProps) {
  const { bg, fg } = getAvatarColor(color);
  const initials = getInitials(name);

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      {url ? (
        <img src={fileUrl(url)} alt={name} className="h-full w-full rounded-full object-cover" />
      ) : (
        <div
          className="flex h-full w-full items-center justify-center rounded-full font-medium select-none"
          style={{ background: bg, color: fg, fontSize: size * 0.38 }}
        >
          {/* Group ki photo na ho to group icon, user ka naam na ho to user icon */}
          {isGroup ? <Users size={size * 0.5} /> : initials || <UserIcon size={size * 0.5} />}
        </div>
      )}
      {online && (
        <span
          className="absolute right-0 bottom-0 rounded-full border-2 border-sidebar bg-[#4caf50]"
          style={{ width: size * 0.28, height: size * 0.28 }}
        />
      )}
    </div>
  );
}

// Conversation ka avatar: group ho to group icon, 1:1 ho to saamne wale ka online dot bhi
export function ConversationAvatar({
  conversation,
  myId,
  size = 48,
  showOnline = false,
}: {
  conversation: Conversation;
  myId: number;
  size?: number;
  showOnline?: boolean;
}) {
  const other = conversation.members.find((m) => m.id !== myId);
  const online = showOnline && conversation.type === "direct" && !!other?.is_online;
  return (
    <Avatar
      name={conversation.title}
      color={conversation.avatar_color}
      url={conversation.avatar_url}
      size={size}
      isGroup={conversation.type === "group"}
      online={online}
    />
  );
}
