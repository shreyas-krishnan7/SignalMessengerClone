import { Avatar } from "@/components/ui/Avatar";
import { formatPhone } from "@/lib/format";
import type { User } from "@/lib/types";

// Ek user ki row: avatar + naam + about/phone. Right side mein kuch bhi (checkbox, badge) daal sakte hain
export function ContactRow({
  user,
  onClick,
  right,
  subtitle,
  name,
}: {
  user: User;
  name?: string; // naam ki jagah kuch aur dikhana ho (jaise "You")
  onClick?: () => void;
  right?: React.ReactNode;
  subtitle?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left hover:bg-hover"
    >
      <Avatar name={user.display_name} color={user.avatar_color} url={user.avatar_url} size={36} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[14px]">{name ?? user.display_name}</p>
        <p className="truncate text-[13px] text-secondary">
          {subtitle ?? (user.about || (user.username ? `@${user.username}` : formatPhone(user.phone)))}
        </p>
      </div>
      {right}
    </button>
  );
}
