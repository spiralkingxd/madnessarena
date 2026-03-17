"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { Eye, LayoutPanelTop, PenSquare } from "lucide-react";
import type { ICommand } from "@uiw/react-md-editor/commands";
import * as commands from "@uiw/react-md-editor/commands";

import { MarkdownRenderer } from "@/components/ui/MarkdownRenderer";
import { cn } from "@/lib/utils";

const MDEditor = dynamic(() => import("@uiw/react-md-editor/nohighlight"), {
  ssr: false,
});

type ViewMode = "editor" | "split" | "preview";

type Props = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minHeight?: number;
};

const toolbarCommands: ICommand[] = [
  commands.bold,
  commands.italic,
  commands.strikethrough,
  commands.divider,
  commands.title1,
  commands.title2,
  commands.title3,
  commands.divider,
  commands.unorderedListCommand,
  commands.orderedListCommand,
  commands.checkedListCommand,
  commands.divider,
  commands.link,
  commands.quote,
  commands.codeBlock,
  commands.table,
  commands.hr,
];

export function MarkdownEditor({
  label,
  value,
  onChange,
  placeholder = "Escreva em Markdown...",
  minHeight = 320,
}: Props) {
  const [viewMode, setViewMode] = useState<ViewMode>("split");
  const [colorMode, setColorMode] = useState("dark");

  useEffect(() => {
    const root = document.documentElement;
    const syncColorMode = () => {
      setColorMode(root.getAttribute("data-theme") === "light" ? "light" : "dark");
    };

    syncColorMode();

    const observer = new MutationObserver(syncColorMode);
    observer.observe(root, { attributes: true, attributeFilter: ["data-theme"] });

    return () => observer.disconnect();
  }, []);

  const modes = useMemo(
    () => [
      { id: "editor", label: "Editor", icon: PenSquare },
      { id: "split", label: "Dividido", icon: LayoutPanelTop },
      { id: "preview", label: "Preview", icon: Eye },
    ] satisfies Array<{ id: ViewMode; label: string; icon: typeof PenSquare }>,
    [],
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="text-sm font-medium text-[color:var(--text-strong)]">{label}</div>
          <p className="text-xs text-[color:var(--text-muted)]">
            Toolbar com suporte a headings, listas, checkboxes, links, código, tabelas e divisores.
          </p>
        </div>

        <div className="inline-flex rounded-xl border border-[color:var(--surface-border)] bg-black/10 p-1">
          {modes.map((mode) => {
            const Icon = mode.icon;
            const isActive = viewMode === mode.id;

            return (
              <button
                key={mode.id}
                type="button"
                onClick={() => setViewMode(mode.id)}
                className={cn(
                  "inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition",
                  isActive
                    ? "bg-[color:var(--accent-cyan)] text-slate-950"
                    : "text-[color:var(--text-muted)] hover:text-[color:var(--text-strong)]",
                )}
              >
                <Icon className="h-4 w-4" />
                {mode.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className={cn("grid gap-4", viewMode === "split" ? "xl:grid-cols-[minmax(0,1.15fr)_minmax(300px,0.85fr)]" : "grid-cols-1")}>
        {viewMode !== "preview" ? (
          <div className="overflow-hidden rounded-2xl border border-[color:var(--surface-border)] bg-[color:var(--topbar-bg)]">
            <div className="border-b border-[color:var(--surface-border)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--text-muted)]">
              Markdown
            </div>
            <div className="markdown-editor-shell" data-color-mode={colorMode}>
              <MDEditor
                value={value}
                onChange={(nextValue) => onChange(nextValue ?? "")}
                preview="edit"
                commands={toolbarCommands}
                extraCommands={[]}
                visibleDragbar={false}
                height={minHeight}
                textareaProps={{
                  placeholder,
                  "aria-label": label,
                }}
              />
            </div>
          </div>
        ) : null}

        {viewMode !== "editor" ? (
          <div className="overflow-hidden rounded-2xl border border-[color:var(--surface-border)] bg-[color:var(--topbar-bg)]">
            <div className="border-b border-[color:var(--surface-border)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--text-muted)]">
              Preview em tempo real
            </div>
            <div className="p-4">
              {value.trim() ? (
                <MarkdownRenderer content={value} />
              ) : (
                <div className="rounded-2xl border border-dashed border-[color:var(--surface-border)] bg-black/10 px-4 py-6 text-sm text-[color:var(--text-muted)]">
                  O preview aparece aqui enquanto voce escreve em Markdown.
                </div>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
