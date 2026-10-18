"use client";

import { useEffect } from "react";

// Dropdown menu: peeche ek transparent layer hai, uspe click = bahar click = menu band
export function Menu({
  onClose,
  children,
  className = "",
}: {
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  // Escape dabane pe bhi menu band (Signal jaisa)
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <>
      <div className="fixed inset-0 z-40" onMouseDown={onClose} />
      <div
        className={`absolute z-50 min-w-[200px] rounded-xl bg-menu p-1.5 shadow-[0_4px_16px_rgba(0,0,0,0.2)] ring-1 ring-black/5 ${className}`}
        onClick={onClose}
      >
        {children}
      </div>
    </>
  );
}

export function MenuItem({
  icon,
  label,
  onClick,
  danger = false,
}: {
  icon?: React.ReactNode;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[13px] whitespace-nowrap hover:bg-hover ${danger ? "text-danger" : ""}`}
    >
      {icon}
      {label}
    </button>
  );
}
