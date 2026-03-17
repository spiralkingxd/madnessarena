import type { ComponentPropsWithoutRef } from "react";

import ReactMarkdown from "react-markdown";
import remarkBreaks from "remark-breaks";
import remarkGfm from "remark-gfm";

import { cn } from "@/lib/utils";

type Props = {
  content: string;
  className?: string;
};

type CodeProps = ComponentPropsWithoutRef<"code"> & {
  inline?: boolean;
};

export function MarkdownRenderer({ content, className }: Props) {
  return (
    <div className={cn("markdown-content", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkBreaks]}
        components={{
          a: ({ className: linkClassName, ...props }) => (
            <a
              {...props}
              className={cn(
                "font-medium text-[color:var(--accent-amber)] underline decoration-[color:color-mix(in_srgb,var(--accent-amber)_60%,transparent)] underline-offset-4 transition hover:text-[color:var(--text-strong)]",
                linkClassName,
              )}
              rel="noreferrer"
              target="_blank"
            />
          ),
          code: ({ className: codeClassName, children, inline, ...props }: CodeProps) => {
            const isBlock = Boolean(codeClassName?.includes("language-")) || String(children).includes("\n");

            if (!isBlock && inline) {
              return (
                <code
                  {...props}
                  className={cn(
                    "rounded-md bg-black/25 px-1.5 py-0.5 font-mono text-[0.92em] text-[color:var(--text-strong)]",
                    codeClassName,
                  )}
                >
                  {children}
                </code>
              );
            }

            return (
              <code
                {...props}
                className={cn(
                  "block overflow-x-auto rounded-2xl bg-[#08121d] px-4 py-3 font-mono text-[13px] leading-6 text-slate-100",
                  codeClassName,
                )}
              >
                {children}
              </code>
            );
          },
          pre: ({ className: preClassName, ...props }) => <pre {...props} className={cn("overflow-x-auto", preClassName)} />,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
