export default function ProfileLoading() {
  return (
    <main className="min-h-[calc(100vh-72px)] bg-[radial-gradient(ellipse_at_top,_#0f2847_0%,_#0b1826_50%,_#050b12_100%)] px-4 py-16">
      <div className="mx-auto w-full max-w-2xl">
        <div className="overflow-hidden rounded-3xl border border-white/10 bg-slate-900/70 shadow-2xl shadow-black/40">
          {/* Gold bar */}
          <div className="h-1.5 w-full bg-gradient-to-r from-yellow-600 via-yellow-400 to-yellow-600" />

          {/* Avatar + name skeleton */}
          <div className="flex flex-col items-center gap-4 px-8 pb-8 pt-10">
            <div className="h-28 w-28 animate-pulse rounded-full bg-slate-700 ring-4 ring-yellow-400/30 ring-offset-2 ring-offset-slate-900" />
            <div className="h-7 w-44 animate-pulse rounded-lg bg-slate-700" />
            <div className="h-7 w-52 animate-pulse rounded-full bg-slate-700" />
          </div>

          {/* Divider */}
          <div className="mx-8 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

          {/* Info grid skeleton */}
          <div className="grid grid-cols-1 sm:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex flex-col items-center gap-2 px-6 py-6">
                <div className="h-3 w-20 animate-pulse rounded bg-slate-700" />
                <div className="h-4 w-28 animate-pulse rounded bg-slate-700" />
              </div>
            ))}
          </div>

          <div className="pb-8" />
        </div>
      </div>
    </main>
  );
}
