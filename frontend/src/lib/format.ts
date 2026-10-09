const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

export function isSameDay(a: Date, b: Date) {
  return a.toDateString() === b.toDateString();
}

function formatClock(date: Date) {
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

// Chat list ka time: "Now", "5m", "10:32 AM", "Mon", "Jan 5"
export function formatListTime(iso: string) {
  const date = new Date(iso);
  const diff = Date.now() - date.getTime();
  if (diff < MINUTE) return "Now";
  if (diff < HOUR) return `${Math.floor(diff / MINUTE)}m`;
  if (isSameDay(date, new Date())) return formatClock(date);
  if (diff < 6 * DAY) return date.toLocaleDateString([], { weekday: "short" });
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

// Message bubble ka time: "Now", "5m", warna "10:32 AM"
export function formatMessageTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < MINUTE) return "Now";
  if (diff < HOUR) return `${Math.floor(diff / MINUTE)}m`;
  return formatClock(new Date(iso));
}

// Messages ke beech date wali line: "Today", "Yesterday", "Monday", "Mon, Jan 5"
export function formatDateSeparator(iso: string) {
  const date = new Date(iso);
  const today = new Date();
  const yesterday = new Date(Date.now() - DAY);
  if (isSameDay(date, today)) return "Today";
  if (isSameDay(date, yesterday)) return "Yesterday";
  if (Date.now() - date.getTime() < 6 * DAY) return date.toLocaleDateString([], { weekday: "long" });
  return date.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
}

export function formatLastSeen(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < MINUTE) return "Last seen just now";
  if (diff < HOUR) return `Last seen ${Math.floor(diff / MINUTE)}m ago`;
  if (diff < DAY) return `Last seen ${Math.floor(diff / HOUR)}h ago`;
  return `Last seen ${new Date(iso).toLocaleDateString([], { month: "short", day: "numeric" })}`;
}

// "Priya Patel" -> "PP", "Aarav" -> "A"
export function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "";
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function firstName(name: string) {
  return name.trim().split(/\s+/)[0] ?? name;
}

export const DISAPPEARING_OPTIONS = [
  { label: "Off", seconds: 0 },
  { label: "30 seconds", seconds: 30 },
  { label: "5 minutes", seconds: 300 },
  { label: "1 hour", seconds: 3600 },
  { label: "8 hours", seconds: 28800 },
  { label: "1 day", seconds: 86400 },
  { label: "1 week", seconds: 604800 },
];

export function formatDisappearing(seconds: number) {
  return DISAPPEARING_OPTIONS.find((option) => option.seconds === seconds)?.label ?? `${seconds} seconds`;
}

// Phone number ko Signal jaisa padhne layak banao: "+919000000001" -> "+91 90000 00001"
export function formatPhone(phone: string) {
  const india = phone.match(/^\+91(\d{5})(\d{5})$/);
  if (india) return `+91 ${india[1]} ${india[2]}`;
  const us = phone.match(/^\+1(\d{3})(\d{3})(\d{4})$/);
  if (us) return `+1 ${us[1]}-${us[2]}-${us[3]}`;
  return phone;
}
