import { Menu, Search } from "lucide-react";

export function SignalLogo({ size = 48, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" className={className} aria-label="Signal">
      <circle cx="24" cy="24" r="21.5" fill="none" stroke="currentColor" strokeWidth="2.6" strokeDasharray="6.5 3" />
      <path d="M24 9.5a14.5 14.5 0 0 0-12.6 21.7L9.5 38.5l7.4-1.9A14.5 14.5 0 1 0 24 9.5z" fill="currentColor" />
    </svg>
  );
}

export function TypingDots() {
  return (
    <span className="inline-flex items-center gap-[3px]" aria-label="typing">
      <span className="typing-dot h-[6px] w-[6px] rounded-full bg-current" />
      <span className="typing-dot h-[6px] w-[6px] rounded-full bg-current" />
      <span className="typing-dot h-[6px] w-[6px] rounded-full bg-current" />
    </span>
  );
}

export function Toggle({
  checked,
  onChange,
  disabled = false,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}) {
  
  return (
    <button
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative h-[18px] w-8 shrink-0 rounded-full transition-colors disabled:opacity-50 ${checked ? "bg-brand" : "bg-toggle-off"}`}
    >
      <span
        className={`absolute top-0.5 left-0.5 h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${checked ? "translate-x-3.5" : ""}`}
      />
    </button>
  );
}

// Chats / Calls / Settings list ke upar wala header. Tabs chhupe hon to hamburger bhi dikhta hai
export function PaneHeader({
  title,
  onShowTabs,
  children,
}: {
  title: string;
  onShowTabs?: () => void;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex h-[52px] shrink-0 items-center gap-2 pr-4 pl-6">
      {onShowTabs && (
        <IconButton label="Show tabs" className="-ml-2 max-md:hidden" onClick={onShowTabs}>
          <Menu size={20} />
        </IconButton>
      )}
      <h1 className="flex-1 text-[20px] font-bold">{title}</h1>
      <div className="relative flex gap-1">{children}</div>
    </div>
  );
}

export function IconButton({
  label,
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      aria-label={label}
      title={label}
      className={`flex h-8 w-8 items-center justify-center rounded-full text-primary hover:bg-hover ${className}`}
      {...props}
    />
  );
}

// Settings / chat details mein icon + label wali ek row
export function ListRow({
  icon,
  label,
  description,
  onClick,
  right,
  danger = false,
}: {
  icon: React.ReactNode;
  label: string;
  description?: string;
  onClick?: () => void;
  right?: React.ReactNode;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left hover:bg-hover ${danger ? "text-danger" : ""}`}
    >
      {icon}
      <span className="min-w-0 flex-1">
        <span className="block text-[14px]">{label}</span>
        {description && <span className="block text-[13px] text-secondary">{description}</span>}
      </span>
      {right}
    </button>
  );
}

export function SearchInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <div className="relative mb-2">
      <Search size={16} className="absolute top-1/2 left-2.5 -translate-y-1/2 text-tertiary" />
      <input
        autoFocus
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-7 w-full rounded-lg bg-input pr-3 pl-8 text-[13px] outline-none placeholder:text-tertiary focus:ring-2 focus:ring-brand"
      />
    </div>
  );
}


export function RoundCheckbox({ checked }: { checked: boolean }) {
  return (
    <span
      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
        checked ? "border-accent bg-accent text-white" : "border-tertiary"
      }`}
    >
      {checked && (
        <svg width="10" height="10" viewBox="0 0 10 10">
          <path d="M2 5.2l2 2 4-4.4" fill="none" stroke="currentColor" strokeWidth="1.8" />
        </svg>
      )}
    </span>
  );
}

export function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="px-2 pt-3 pb-1 text-[14px] font-semibold">{children}</p>;
}

export function Spinner() {
  return <div className="h-6 w-6 animate-spin rounded-full border-2 border-selected border-t-accent" />;
}
