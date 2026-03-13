"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { assertAdminAccess, enforceAdminRateLimit, logAdminAction } from "@/app/admin/_lib";
import { queueOrSendDiscordNotification } from "@/lib/discord-notifications";

type ActionResult = { success?: string; error?: string };

const editTeamSchema = z.object({
  teamId: z.string().uuid(),
  name: z.string().min(3).max(30).trim(),
  logo_url: z.string().url().optional().or(z.literal("")),
});

const transferCaptainSchema = z.object({
  teamId: z.string().uuid(),
  newCaptainId: z.string().uuid(),
});

const dissolveTeamSchema = z.object({
  teamId: z.string().uuid(),
});

const removeMemberSchema = z.object({
  teamId: z.string().uuid(),
  userId: z.string().uuid(),
});

function revalidateTeamPaths(teamId?: string) {
  revalidatePath("/admin/teams");
  revalidatePath("/admin/dashboard");
  revalidatePath("/teams");
  if (teamId) {
    revalidatePath(`/teams/${teamId}`);
    revalidatePath(`/admin/teams/${teamId}`);
  }
}

export async function editTeam(teamId: string, data: { name: string; logo_url?: string | null }): Promise<ActionResult> {
  const parsed = editTeamSchema.safeParse({ teamId, name: data.name, logo_url: data.logo_url ?? "" });
  if (!parsed.success) return { error: "Dados inválidos." };

  try {
    const { supabase, adminId } = await assertAdminAccess();
    await enforceAdminRateLimit(supabase, adminId, "edit_team");

    const { error } = await supabase
      .from("teams")
      .update({ name: parsed.data.name, logo_url: parsed.data.logo_url || null, updated_at: new Date().toISOString() })
      .eq("id", parsed.data.teamId);

    if (error) return { error: "Não foi possível editar a equipe." };

    await logAdminAction(supabase, {
      adminId,
      action: "edit_team",
      targetType: "team",
      targetId: parsed.data.teamId,
      details: { name: parsed.data.name },
    });

    revalidateTeamPaths(parsed.data.teamId);
    return { success: "Equipe atualizada com sucesso." };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Falha ao editar equipe." };
  }
}

export async function transferTeamCaptain(teamId: string, newCaptainId: string): Promise<ActionResult> {
  const parsed = transferCaptainSchema.safeParse({ teamId, newCaptainId });
  if (!parsed.success) return { error: "Dados inválidos." };

  try {
    const { supabase, adminId } = await assertAdminAccess();
    await enforceAdminRateLimit(supabase, adminId, "transfer_team_captain");

    const { data: member } = await supabase
      .from("team_members")
      .select("user_id")
      .eq("team_id", parsed.data.teamId)
      .eq("user_id", parsed.data.newCaptainId)
      .maybeSingle();

    if (!member) return { error: "Novo capitão precisa ser membro da equipe." };

    const { error } = await supabase
      .from("teams")
      .update({ captain_id: parsed.data.newCaptainId, updated_at: new Date().toISOString() })
      .eq("id", parsed.data.teamId);

    if (error) return { error: "Não foi possível transferir liderança." };

    await logAdminAction(supabase, {
      adminId,
      action: "transfer_team_captain",
      targetType: "team",
      targetId: parsed.data.teamId,
      details: { newCaptainId: parsed.data.newCaptainId },
    });

    revalidateTeamPaths(parsed.data.teamId);
    return { success: "Capitão transferido com sucesso." };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Falha ao transferir capitão." };
  }
}

export async function removeTeamMember(teamId: string, userId: string): Promise<ActionResult> {
  const parsed = removeMemberSchema.safeParse({ teamId, userId });
  if (!parsed.success) return { error: "Dados inválidos." };

  try {
    const { supabase, adminId } = await assertAdminAccess();
    await enforceAdminRateLimit(supabase, adminId, "remove_team_member_admin");

    const { data: team } = await supabase
      .from("teams")
      .select("captain_id")
      .eq("id", parsed.data.teamId)
      .maybeSingle<{ captain_id: string }>();

    if (!team) return { error: "Equipe não encontrada." };
    if (team.captain_id === parsed.data.userId) {
      return { error: "Use transferência de capitão antes de remover o líder." };
    }

    const { error } = await supabase
      .from("team_members")
      .delete()
      .eq("team_id", parsed.data.teamId)
      .eq("user_id", parsed.data.userId);

    if (error) return { error: "Não foi possível remover membro." };

    await logAdminAction(supabase, {
      adminId,
      action: "remove_team_member_admin",
      targetType: "team",
      targetId: parsed.data.teamId,
      details: { userId: parsed.data.userId },
    });

    revalidateTeamPaths(parsed.data.teamId);
    revalidatePath(`/admin/members/${parsed.data.userId}`);
    revalidatePath("/profile/me");
    return { success: "Membro removido com sucesso." };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Falha ao remover membro." };
  }
}

export async function dissolveTeam(teamId: string): Promise<ActionResult> {
  const parsed = dissolveTeamSchema.safeParse({ teamId });
  if (!parsed.success) return { error: "Equipe inválida." };

  try {
    const { supabase, adminId } = await assertAdminAccess();
    await enforceAdminRateLimit(supabase, adminId, "dissolve_team_admin");

    const { data: team } = await supabase
      .from("teams")
      .select("name")
      .eq("id", parsed.data.teamId)
      .maybeSingle<{ name: string }>();

    const { error: delMembersError } = await supabase
      .from("team_members")
      .delete()
      .eq("team_id", parsed.data.teamId);

    if (delMembersError) return { error: "Não foi possível limpar os membros da equipe." };

    const { error } = await supabase
      .from("teams")
      .delete()
      .eq("id", parsed.data.teamId);

    if (error) return { error: "Não foi possível dissolver a equipe." };

    await logAdminAction(supabase, {
      adminId,
      action: "dissolve_team_admin",
      targetType: "team",
      targetId: parsed.data.teamId,
      details: { name: team?.name ?? null },
      severity: "warning",
    });

    await queueOrSendDiscordNotification({
      supabase,
      createdBy: adminId,
      type: "team_dissolved",
      data: {
        teamName: team?.name ?? parsed.data.teamId,
        teamId: parsed.data.teamId,
      },
    });

    revalidateTeamPaths(parsed.data.teamId);
    revalidatePath("/profile/me");
    return { success: "Equipe dissolvida com sucesso." };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Falha ao dissolver equipe." };
  }
}
