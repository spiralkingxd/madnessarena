"use client";

import { useMemo, useState, useTransition } from "react";
import { ArrowDown, ArrowUp, GripVertical, Plus, Save, Trash2 } from "lucide-react";

import { saveRulesContent } from "@/app/admin/rules-actions";
import { AdminButton } from "@/components/admin/admin-button";
import { useAdminToast } from "@/components/admin/admin-toast";

type RuleItem = {
  id?: string;
  title: string;
  content: string;
};

type Props = {
  initialRules: Array<{ id: string; order: number; title: string; content: string }>;
  initialFooter: string;
};

function swap<T>(arr: T[], from: number, to: number) {
  const copy = [...arr];
  const [item] = copy.splice(from, 1);
  copy.splice(to, 0, item);
  return copy;
}

export function RulesAdminPanel({ initialRules, initialFooter }: Props) {
  const [isPending, startTransition] = useTransition();
  const { pushToast } = useAdminToast();

  const bootRules = useMemo<RuleItem[]>(
    () =>
      initialRules
        .sort((a, b) => a.order - b.order)
        .map((item) => ({ id: item.id, title: item.title, content: item.content })),
    [initialRules],
  );

  const [rules, setRules] = useState<RuleItem[]>(bootRules);
  const [footer, setFooter] = useState(initialFooter);

  function updateRule(index: number, key: "title" | "content", value: string) {
    setRules((prev) => prev.map((rule, idx) => (idx === index ? { ...rule, [key]: value } : rule)));
  }

  function addRule() {
    setRules((prev) => [...prev, { title: "", content: "" }]);
  }

  function removeRule(index: number) {
    setRules((prev) => prev.filter((_, idx) => idx !== index));
  }

  function moveRule(index: number, direction: "up" | "down") {
    if (direction === "up" && index > 0) setRules((prev) => swap(prev, index, index - 1));
    if (direction === "down" && index < rules.length - 1) setRules((prev) => swap(prev, index, index + 1));
  }

  function submit() {
    startTransition(async () => {
      const normalized = rules
        .map((rule) => ({
          id: rule.id,
          title: rule.title.trim(),
          content: rule.content.trim(),
        }))
        .filter((rule) => rule.title.length > 0 || rule.content.length > 0);

      if (normalized.length === 0) {
        pushToast("error", "Adicione pelo menos uma regra antes de salvar.");
        return;
      }

      const invalid = normalized.find((item) => !item.title || !item.content);
      if (invalid) {
        pushToast("error", "Toda regra precisa de título e conteúdo.");
        return;
      }

      const result = await saveRulesContent({ rules: normalized, footer });
      pushToast(result.error ? "error" : "success", result.error ?? result.success ?? "Atualização concluída.");
    });
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
      <section className="admin-surface rounded-2xl border p-5 md:p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-[color:var(--text-muted)]">Editor</h2>
          <AdminButton type="button" variant="ghost" onClick={addRule}>
            <Plus className="h-4 w-4" />
            Nova regra
          </AdminButton>
        </div>

        <div className="space-y-3">
          {rules.map((rule, index) => (
            <article key={`${rule.id ?? "new"}-${index}`} className="rounded-2xl border border-[color:var(--surface-border)] bg-[color:var(--bg-soft)] p-4">
              <div className="mb-3 flex items-center justify-between gap-2">
                <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[color:var(--accent-amber)]">
                  <GripVertical className="h-4 w-4" />
                  Regra {index + 1}
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => moveRule(index, "up")}
                    className="rounded-lg border border-[color:var(--surface-border)] p-2 text-[color:var(--text-muted)] transition hover:text-[color:var(--text-strong)]"
                    aria-label={`Subir regra ${index + 1}`}
                  >
                    <ArrowUp className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveRule(index, "down")}
                    className="rounded-lg border border-[color:var(--surface-border)] p-2 text-[color:var(--text-muted)] transition hover:text-[color:var(--text-strong)]"
                    aria-label={`Descer regra ${index + 1}`}
                  >
                    <ArrowDown className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => removeRule(index)}
                    className="rounded-lg border border-rose-400/40 p-2 text-rose-400 transition hover:bg-rose-400/10"
                    aria-label={`Remover regra ${index + 1}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                <label className="space-y-1 text-sm text-[color:var(--text-strong)]">
                  <span>Título</span>
                  <input
                    value={rule.title}
                    onChange={(e) => updateRule(index, "title", e.target.value)}
                    placeholder="Ex.: Conduta e Fair Play"
                    className="w-full rounded-xl border border-[color:var(--surface-border)] bg-black/15 px-3 py-2 text-sm text-[color:var(--text-strong)] outline-none focus:border-[color:var(--accent-cyan)]"
                  />
                </label>

                <label className="space-y-1 text-sm text-[color:var(--text-strong)]">
                  <span>Conteúdo</span>
                  <textarea
                    value={rule.content}
                    onChange={(e) => updateRule(index, "content", e.target.value)}
                    rows={4}
                    placeholder="Descreva a diretriz com detalhes..."
                    className="w-full resize-y rounded-xl border border-[color:var(--surface-border)] bg-black/15 px-3 py-2 text-sm text-[color:var(--text-strong)] outline-none focus:border-[color:var(--accent-cyan)]"
                  />
                </label>
              </div>
            </article>
          ))}
        </div>

        <div className="mt-4 space-y-2">
          <label className="space-y-1 text-sm text-[color:var(--text-strong)]">
            <span>Rodapé informativo</span>
            <textarea
              value={footer}
              onChange={(e) => setFooter(e.target.value)}
              rows={3}
              placeholder="Texto exibido abaixo da lista de regras na página pública"
              className="w-full resize-y rounded-xl border border-[color:var(--surface-border)] bg-black/15 px-3 py-2 text-sm text-[color:var(--text-strong)] outline-none focus:border-[color:var(--accent-cyan)]"
            />
          </label>
        </div>

        <div className="mt-5 flex justify-end">
          <AdminButton type="button" onClick={submit} disabled={isPending}>
            <Save className="h-4 w-4" />
            {isPending ? "Salvando..." : "Salvar Regras"}
          </AdminButton>
        </div>
      </section>

      <section className="admin-surface rounded-2xl border p-5 md:p-6">
        <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-[color:var(--text-muted)]">Pré-visualização</h2>
        <div className="mt-4 rounded-2xl border border-[color:var(--surface-border)] bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.12),transparent_45%)] p-5">
          <div className="space-y-4">
            {rules.map((rule, index) => (
              <article key={`preview-${rule.id ?? "new"}-${index}`}>
                <h3 className="text-base font-bold text-white">{index + 1}. {rule.title || "Título da regra"}</h3>
                <p className="mt-1 whitespace-pre-line text-sm text-slate-300">{rule.content || "Conteúdo da regra..."}</p>
              </article>
            ))}
          </div>

          <hr className="my-5 border-white/10" />
          <p className="whitespace-pre-line text-sm text-slate-400">
            {footer || "Estas regras estão sujeitas a atualizações antes do início de cada temporada. Mantenha-se informado através do nosso Discord."}
          </p>
        </div>
      </section>
    </div>
  );
}
