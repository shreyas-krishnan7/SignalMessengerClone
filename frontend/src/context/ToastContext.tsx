"use client";

import { createContext, useCallback, useContext, useState } from "react";

interface Toast {
  id: number;
  text: string;
  onClick?: () => void;
}

interface ToastValue {
  showToast: (text: string, onClick?: () => void) => void;
}

const ToastContext = createContext<ToastValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((text: string, onClick?: () => void) => {
    const id = Date.now() + Math.random();
    // Ek time pe max 3 toasts dikhate hain
    setToasts((current) => [...current.slice(-2), { id, text, onClick }]);
    setTimeout(() => setToasts((current) => current.filter((t) => t.id !== id)), 4000);
  }, []);

  function handleClick(toast: Toast) {
    toast.onClick?.();
    setToasts((current) => current.filter((t) => t.id !== toast.id));
  }

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-6 z-[100] flex flex-col items-center gap-2 px-4">
        {toasts.map((toast) => (
          <button
            key={toast.id}
            onClick={() => handleClick(toast)}
            className="pointer-events-auto max-w-md truncate rounded-lg bg-[#3b3b3b] px-4 py-2.5 text-sm text-white shadow-lg"
          >
            {toast.text}
          </button>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const value = useContext(ToastContext);
  if (!value) throw new Error("useToast must be used inside ToastProvider");
  return value;
}
