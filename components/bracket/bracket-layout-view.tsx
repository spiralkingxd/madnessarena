"use client";

import { BracketVisualLayout } from "@/components/bracket/bracket-visual-layout";
import type { BracketMatchRow } from "@/app/admin/matches/_data";

interface BracketLayoutViewProps {
  matches: BracketMatchRow[];
  format?: "single_elimination" | "double_elimination";
}

export function BracketLayoutView({ matches, format = "single_elimination" }: BracketLayoutViewProps) {
  return (
    <div className="rounded-2xl bg-gradient-to-b from-white/5 to-transparent p-4 md:p-6">
      <BracketVisualLayout matches={matches} format={format} />
    </div>
  );
}
