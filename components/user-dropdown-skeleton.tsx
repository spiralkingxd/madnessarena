import { ChevronDown } from "lucide-react";

export function UserDropdownSkeleton() {
  return (
    <div className="inline-flex items-center gap-2 rounded-xl border border-[color:var(--surface-border)] bg-[color:var(--bg-soft)] px-3 py-2">
      <div className="relative h-7 w-7 shrink-0 animate-pulse overflow-hidden rounded-full bg-black/10 dark:bg-white/10" />
      <div className="hidden h-4 w-20 animate-pulse rounded bg-black/10 dark:bg-white/10 sm:inline" />
      <ChevronDown className="h-4 w-4 opacity-30" />
    </div>
  );
}
