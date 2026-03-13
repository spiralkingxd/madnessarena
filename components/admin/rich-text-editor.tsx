"use client";

import { useEffect, useId, useRef } from "react";
import { Bold, Italic, List, ListOrdered, Pilcrow } from "lucide-react";

import { cn } from "@/lib/utils";

function runCommand(command: string) {
  const doc = document as Document & {
    execCommand?: (commandId: string, showUI?: boolean, value?: string) => boolean;
  };
  doc.execCommand?.(command, false);
}

export function RichTextEditor({
  label,
  value,
  onChange,
  placeholder,
  minHeight = 220,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minHeight?: number;
}) {
  const id = useId();
  const editorRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!editorRef.current) return;
    if (editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value || "";
    }
  }, [value]);

  return (
    <label className="flex flex-col gap-2 text-sm text-slate-200">
      <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">{label}</span>
      <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/20">
        <div className="flex flex-wrap gap-1 border-b border-white/10 p-2">
          {[
            { icon: <Bold className="h-4 w-4" />, command: "bold", title: "Negrito" },
            { icon: <Italic className="h-4 w-4" />, command: "italic", title: "Itálico" },
            { icon: <List className="h-4 w-4" />, command: "insertUnorderedList", title: "Lista" },
            { icon: <ListOrdered className="h-4 w-4" />, command: "insertOrderedList", title: "Lista ordenada" },
            { icon: <Pilcrow className="h-4 w-4" />, command: "formatBlock", title: "Parágrafo" },
          ].map((item) => (
            <button
              key={item.title}
              type="button"
              title={item.title}
              className="rounded-lg border border-white/10 bg-white/5 p-2 text-slate-200 transition hover:bg-white/10"
              onClick={() => {
                if (item.command === "formatBlock") {
                  const doc = document as Document & {
                    execCommand?: (commandId: string, showUI?: boolean, value?: string) => boolean;
                  };
                  doc.execCommand?.("formatBlock", false, "p");
                  return;
                }
                runCommand(item.command);
              }}
            >
              {item.icon}
            </button>
          ))}
        </div>
        <div
          id={id}
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          className={cn(
            "prose prose-invert max-w-none px-4 py-3 text-sm text-slate-100 outline-none",
            !value && "empty:before:text-slate-500 empty:before:content-[attr(data-placeholder)]",
          )}
          data-placeholder={placeholder ?? "Digite aqui..."}
          style={{ minHeight }}
          onInput={(event) => onChange((event.currentTarget as HTMLDivElement).innerHTML)}
        />
      </div>
    </label>
  );
}
