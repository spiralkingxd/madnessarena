"use client";

import { useState } from "react";
import { Plus } from "lucide-react";

import { CreateTeamModal } from "@/components/create-team-modal";

export function OpenTeamModalButton({ userId, userXboxGamertag, systemMaxMembers }: { userId: string, userXboxGamertag: string | null, systemMaxMembers: number }){
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-xl bg-amber-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-amber-300"
      >
        <Plus className="h-4 w-4" />
        Fundar equipe
      </button>

      {open && (
        <CreateTeamModal userId={userId} userXboxGamertag={userXboxGamertag} onClose={() => setOpen(false)} systemMaxMembers={systemMaxMembers} />
      )}
    </>
  );
}

