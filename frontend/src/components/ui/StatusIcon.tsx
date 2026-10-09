import { CircleAlert } from "lucide-react";
import type { MessageStatus } from "@/lib/types";

// circle wale ticks: sending (dotted), sent (1 circle), delivered (2 circles), read (2 bhare hue circles)
export function StatusIcon({ status, checkColor = "white" }: { status: MessageStatus; checkColor?: string }) {
  if (status === "failed") return <CircleAlert size={13} className="text-danger" />;

  if (status === "sending") {
    return (
      <svg width="12" height="12" viewBox="0 0 12 12" aria-label="Sending">
        <circle cx="6" cy="6" r="5" fill="none" stroke="currentColor" strokeWidth="1.2" strokeDasharray="2 1.6" />
      </svg>
    );
  }

  if (status === "sent") {
    return (
      <svg width="12" height="12" viewBox="0 0 12 12" aria-label="Sent">
        <circle cx="6" cy="6" r="5" fill="none" stroke="currentColor" strokeWidth="1.2" />
        <path d="M3.6 6.2l1.6 1.6 3.2-3.4" fill="none" stroke="currentColor" strokeWidth="1.2" />
      </svg>
    );
  }

  const filled = status === "read";
  return (
    <svg width="18" height="12" viewBox="0 0 18 12" aria-label={filled ? "Read" : "Delivered"}>
      <circle cx="6" cy="6" r="5" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.2" />
      <path d="M3.6 6.2l1.6 1.6 3.2-3.4" fill="none" stroke={filled ? checkColor : "currentColor"} strokeWidth="1.2" />
      <circle
        cx="12"
        cy="6"
        r="5"
        fill={filled ? "currentColor" : "none"}
        stroke={filled ? checkColor : "currentColor"}
        strokeWidth="1.2"
      />
      <path d="M9.6 6.2l1.6 1.6 3.2-3.4" fill="none" stroke={filled ? checkColor : "currentColor"} strokeWidth="1.2" />
    </svg>
  );
}
