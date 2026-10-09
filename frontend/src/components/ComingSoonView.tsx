import { PaneHeader } from "@/components/ui/misc";

// Calls aur Stories sections placeholder 
export function ComingSoonView({
  title,
  icon,
  emptyTitle,
  emptyText,
  message,
  onShowTabs,
}: {
  title: string;
  icon: React.ReactNode;
  emptyTitle: string;
  emptyText: string;
  message: string;
  onShowTabs?: () => void;
}) {
  return (
    <>
      <aside className="flex min-w-0 flex-1 flex-col border-r border-line bg-sidebar md:w-[320px] md:flex-none">
        <PaneHeader title={title} onShowTabs={onShowTabs} />
        {/* Signal jaisa khali list ka message, beech mein */}
        <div className="flex flex-1 flex-col items-center justify-center px-6 pb-16 text-center">
          <p className="text-[17px] font-semibold">{emptyTitle}</p>
          <p className="mt-1 text-[14px] text-secondary">{emptyText}</p>
        </div>
      </aside>
      <section className="hidden flex-1 flex-col items-center justify-center bg-panel px-6 text-center md:flex">
        <div className="text-tertiary">{icon}</div>
        <h2 className="mt-4 text-xl font-semibold">Coming soon</h2>
        <p className="mt-1 max-w-xs text-sm text-secondary">{message}</p>
      </section>
    </>
  );
}
