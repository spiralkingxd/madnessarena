import type { ReactNode } from "react";

export function AdminCard({
  label,
  value,
  icon,
  helper,
}: {
  label: string;
  value: string;
  icon: ReactNode;
  helper?: string;
}) {
  return (
    <article className="rounded-2xl border border-white/10 bg-slate-950/60 p-5 shadow-lg shadow-black/20">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-400">{label}</p>
          <p className="mt-2 text-3xl font-bold text-white">{value}</p>
          {helper ? <p className="mt-1 text-sm text-slate-400">{helper}</p> : null}
        </div>
        <span className="rounded-xl border border-cyan-300/20 bg-cyan-300/10 p-3 text-cyan-200">
          {icon}
        </span>
      </div>
    </article>
  );
}
