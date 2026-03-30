"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/theme-toggle";
import { LanguageSwitcher } from "@/components/language-switcher";



type NavDict = {
  navlinks?: {
    home?: string;
    events?: string;
    rules?: string;
    teams?: string;
    ranking?: string;
    streams?: string;
    streamers?: string;
  };
};

export function NavLinks({ dict }: { dict: NavDict }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  const LINKS = [
    { href: "/", label: dict?.navlinks?.home ?? "Início" },
    { href: "/events", label: dict?.navlinks?.events ?? "Torneios" },
    { href: "/regras", label: dict?.navlinks?.rules ?? "Regras" },
    { href: "/teams", label: dict?.navlinks?.teams ?? "Equipes" },
    { href: "/ranking", label: dict?.navlinks?.ranking ?? "Ranking" },
    { href: "/transmissoes", label: dict?.navlinks?.streams ?? "Transmissões" },
  ];
  const STREAMERS_LINK = { href: "/streamers", label: dict?.navlinks?.streamers ?? "Streamers" };

  function isActive(href: string) {
    if (!href) return false;
    return href === "/" ? pathname === "/" : pathname.startsWith(href);
  }

  const linkCls = (href: string | undefined, hasFocus: boolean = false) =>
    cn(
      "rounded-lg px-3.5 py-2 text-sm font-medium transition",
      hasFocus || (href && isActive(href))
        ? "border border-cyan-300/25 bg-cyan-300/10 text-cyan-100"
        : "text-slate-400 hover:bg-white/8 hover:text-slate-100",
    );

  return (
    <>
      {/* Desktop nav */}
      <nav className="hidden items-center gap-0.5 md:flex">
        {LINKS.map((item) => {
          if (item.href === "/transmissoes") {
            return (
              <div key={item.href} className="relative p-1 group">
                <Link href={item.href as string} className={linkCls(item.href)}>
                  {item.label}
                </Link>

                <div className="pointer-events-none absolute left-1/2 top-full z-50 -translate-x-1/2 pt-2 opacity-0 translate-y-1 transition-all duration-200 group-hover:pointer-events-auto group-hover:opacity-100 group-hover:translate-y-0 group-focus-within:pointer-events-auto group-focus-within:opacity-100 group-focus-within:translate-y-0">
                  <div className="rounded-xl border border-cyan-300/20 bg-slate-950/90 p-1.5 shadow-[0_12px_35px_rgba(0,0,0,0.45)] backdrop-blur-md">
                  <Link
                    href={STREAMERS_LINK.href}
                    className="inline-flex items-center gap-2 whitespace-nowrap rounded-lg border border-cyan-300/15 bg-gradient-to-r from-cyan-400/15 to-sky-400/10 px-4 py-2 text-sm font-semibold text-cyan-100 hover:from-cyan-400/25 hover:to-sky-400/20"
                  >
                    <span className="h-2 w-2 rounded-full bg-cyan-300 shadow-[0_0_10px_rgba(34,211,238,0.8)]" />
                    {STREAMERS_LINK.label}
                  </Link>
                  </div>
                </div>
              </div>
            );
          }

          return (
            <div key={item.href} className="p-1">
              <Link href={item.href as string} className={linkCls(item.href)}>
                {item.label}
              </Link>
            </div>
          );
        })}
      </nav>

      {/* Mobile hamburger */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="rounded-lg border border-white/10 p-2 text-slate-400 transition hover:cyan-300/10 hover:text-cyan-100 md:hidden"
        aria-label={open ? "Fechar menu" : "Abrir menu"}
      >
        {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {/* Mobile dropdown */}
      {open && (
        <div className="absolute inset-x-0 top-[72px] z-50 border-b border-white/10 bg-[#050b12]/96 backdrop-blur-xl md:hidden max-h-[calc(100vh-72px)] overflow-y-auto">
          <nav className="flex flex-col gap-1 px-4 py-4">
            {LINKS.map((item) => {
              return (
                <Link
                  key={item.href}
                  href={item.href as string}
                  onClick={() => setOpen(false)}
                  className={cn(linkCls(item.href), "py-3 text-base")}
                >
                  {item.label}
                </Link>
              );
            })}
            <Link
              href={STREAMERS_LINK.href}
              onClick={() => setOpen(false)}
              className={cn(linkCls(STREAMERS_LINK.href), "py-3 text-base")}
            >
              {STREAMERS_LINK.label}
            </Link>
            
            <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-4 md:hidden">
              <span className="text-sm font-medium text-slate-400">Preferências</span>
              <div className="flex items-center gap-2">
                <LanguageSwitcher />
                <ThemeToggle />
              </div>
            </div>
          </nav>
        </div>
      )}
    </>
  );
}
