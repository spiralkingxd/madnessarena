"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";

import { removeTeamMember, transferTeamCaptain } from "@/app/admin/team-actions";
import { AdminButton } from "@/components/admin/admin-button";
import { useAdminToast } from "@/components/admin/admin-toast";

export function TeamDetailMemberActions({
  teamId,
  userId,
  isCaptain,
  displayName,
}: {
  teamId: string;
  userId: string;
  isCaptain: boolean;
  displayName: string;
}) {
  const router = useRouter();
  const { pushToast } = useAdminToast();
  const [isPending, startTransition] = useTransition();

  if (isCaptain) {
    return (
      <AdminButton
        variant="ghost"
        className="px-2 py-1 text-xs"
        disabled={isPending}
        onClick={() => {
          const ok = window.confirm(`Transferir liderança para ${displayName}?`);
          if (!ok) return;
          startTransition(async () => {
            const result = await transferTeamCaptain(teamId, userId);
            pushToast(result.error ? "error" : "success", result.error ?? result.success ?? "Ação concluída.");
            router.refresh();
          });
        }}
      >
        Transferir liderança
      </AdminButton>
    );
  }

  return (
    <AdminButton
      variant="danger"
      className="px-2 py-1 text-xs"
      disabled={isPending}
      onClick={() => {
        const ok = window.confirm(`Remover ${displayName} da equipe?`);
        if (!ok) return;
        startTransition(async () => {
          const result = await removeTeamMember(teamId, userId);
          pushToast(result.error ? "error" : "success", result.error ?? result.success ?? "Ação concluída.");
          router.refresh();
        });
      }}
    >
      Remover
    </AdminButton>
  );
}
