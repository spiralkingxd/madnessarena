import { cn } from "@/lib/utils";

type Tone = "active" | "inactive" | "pending" | "danger" | "info";

export function AdminBadge({
  children,
  tone = "info",
}: {
  children: string;
  tone?: Tone;
}) {
  const tones: Record<Tone, string> = {
    active: "border-emerald-300/30 bg-emerald-300/10 text-emerald-200",
    inactive: "border-slate-300/25 bg-slate-300/10 text-slate-600 dark:text-slate-300",
    pending: "border-amber-300/30 bg-amber-100 dark:bg-amber-300/10 text-amber-200",
    danger: "border-rose-300/30 bg-rose-300/10 text-rose-200",
    info: "border-cyan-300/30 bg-cyan-100 dark:bg-cyan-300/10 text-cyan-900 dark:text-cyan-100",
  };

  return (
    <span
      className={cn(
        "inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em]",
        tones[tone],
      )}
    >
      {children}
    </span>
  );
}
