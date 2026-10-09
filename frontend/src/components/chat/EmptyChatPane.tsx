import { Lock } from "lucide-react";
import { SignalLogo } from "@/components/ui/misc";

// Koi chat select nahi hai tab right side ka welcome screen (sirf desktop pe)
export function EmptyChatPane() {
  return (
    <section className="relative hidden flex-1 flex-col items-center justify-center bg-panel px-6 text-center md:flex">
      <SignalLogo size={96} className="text-primary" />
      <h2 className="mt-5 text-[20px] font-semibold">Welcome to Signal</h2>
      <p className="mt-1 text-[14px] text-secondary">Select a chat or start a new conversation</p>
      <p className="absolute bottom-6 flex items-center gap-1.5 text-[13px] text-secondary">
        <Lock size={12} /> Your messages are end-to-end encrypted
      </p>
    </section>
  );
}
