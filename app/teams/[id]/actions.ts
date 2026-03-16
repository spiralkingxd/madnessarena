"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

type ActionResult = {
  error?: string | null;
  success?: string | null;
};

export type TeamMemberProfile = {
  id: string;
  display_name: string;
  username: string;
  avatar_url: string | null;
  xbox_gamertag: string | null;
};

export type SearchCandidate = TeamMemberProfile & {
  team_count: number;
};

function toFriendlyTeamError(message?: string | null): string {
  const msg = (message ?? "").toLowerCase();

  if (msg.includes("1 equipe") || msg.includes("limite mÝ¡ximo")) {
    return "VocÝª jÝ¡ participa de uma equipe";
  }
  if (msg.includes("10 membros") || msg.includes("equipe atingiu")) {
    return "Esta equipe está¡ cheia (10/10)";
  }
  if (msg.includes("jÝ¡ existe") || msg.includes("duplicate")) {
    return "Este nome de equipe jÝ¡ está¡ em uso";
  }
  if (msg.includes("apenas o capitÝ£o") || msg.includes("captain")) {
    return "Apenas o capitÝ£o pode gerenciar a equipe";
  }

  return "NÝ£o foi possÝ­vel concluir a aÝ§Ý£o. Tente novamente.";
}

const updateSettingsSchema = z.object({
  teamId: z.string().uuid("Equipe invÝ¡lida."),
  name: z
    .string()
    .min(3, "O nome deve ter pelo menos 3 caracteres.")
    .max(30, "O nome pode ter no mÝ¡ximo 30 caracteres.")
    .trim(),
  max_members: z.number().min(1).max(50).optional(), logo_url: z.string().url("URL do logo invÝ¡lida.").or(z.literal("")),
});

const transferLeadershipSchema = z.object({
  teamId: z.string().uuid("Equipe invÝ¡lida."),
  targetUserId: z.string().uuid("Membro invÝ¡lido."),
});

const removeMemberSchema = z.object({
  teamId: z.string().uuid("Equipe invÝ¡lida."),
  targetUserId: z.string().uuid("Membro invÝ¡lido."),
});

const addMemberSchema = z.object({
  teamId: z.string().uuid("Equipe invÝ¡lida."),
  userId: z.string().uuid("UsuÝ¡rio invÝ¡lido."),
});

const dissolveSchema = z.object({
  teamId: z.string().uuid("Equipe invÝ¡lida."),
  confirmName: z.string().min(1, "Digite o nome da equipe para confirmar."),
});

const leaveTeamSchema = z.object({
  teamId: z.string().uuid("Equipe invÝ¡lida."),
});

async function requireCaptain(teamId: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { supabase, error: "VocÝª precisa estar logado.", user: null, team: null };
  }

  const { data: team } = await supabase
    .from("teams")
    .select("id, name, captain_id, max_members")
    .eq("id", teamId)
    .maybeSingle();

  if (!team) {
    return { supabase, error: "Equipe nÝ£o encontrada.", user, team: null };
  }

  if ((team.captain_id as string) !== user.id) {
    return {
      supabase,
      error: "Apenas o capitÝ£o pode gerenciar a equipe",
      user,
      team,
    };
  }

  return { supabase, error: null, user, team };
}

function revalidateTeamPaths(teamId: string) {
  revalidatePath(`/teams/${teamId}`);
  revalidatePath("/teams");
  revalidatePath("/profile/me");
}

export async function leaveTeam(input: { teamId: string }): Promise<ActionResult> {
  const parsed = leaveTeamSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados invÝ¡lidos." };
  }

  const { teamId } = parsed.data;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "VocÝª precisa estar logado." };
  }

  const { data: team } = await supabase
    .from("teams")
    .select("id, captain_id")
    .eq("id", teamId)
    .maybeSingle();

  if (!team) {
    return { error: "Equipe nÝ£o encontrada." };
  }

  if ((team.captain_id as string) === user.id) {
    return {
      error: "CapitÝ£o nÝ£o pode sair da equipe. Transfira a lideranÝ§a ou dissolva a equipe.",
    };
  }

  const { data: membership } = await supabase
    .from("team_members")
    .select("id")
    .eq("team_id", teamId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership) {
    return { error: "VocÝª nÝ£o faz parte desta equipe." };
  }

  const { error } = await supabase
    .from("team_members")
    .delete()
    .eq("team_id", teamId)
    .eq("user_id", user.id)
    .neq("role", "captain");

  if (error) {
    return { error: toFriendlyTeamError(error.message) };
  }

  revalidateTeamPaths(teamId);
  return { success: "VocÝª saiu da equipe com sucesso." };
}

export async function searchTeamCandidates(
  teamId: string,
  term: string,
): Promise<SearchCandidate[]> {
  const q = term.trim();
  if (q.length < 2) return [];

  const guard = await requireCaptain(teamId);
  if (guard.error || !guard.team) return [];

  const { supabase } = guard;

  const { data: teamMembers } = await supabase
    .from("team_members")
    .select("user_id")
    .eq("team_id", teamId);

  const excluded = new Set<string>((teamMembers ?? []).map((m) => m.user_id as string));

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, display_name, username, avatar_url, xbox_gamertag")
    .or(`username.ilike.%${q}%,display_name.ilike.%${q}%`)
    .limit(20);

  const candidates = (profiles ?? []).filter((p) => !excluded.has(p.id as string));
  if (candidates.length === 0) return [];

  const candidateIds = candidates.map((c) => c.id as string);
  const { data: memberships } = await supabase
    .from("team_members")
    .select("user_id")
    .in("user_id", candidateIds);

  const countMap = new Map<string, number>();
  for (const row of memberships ?? []) {
    const uid = row.user_id as string;
    countMap.set(uid, (countMap.get(uid) ?? 0) + 1);
  }

  return candidates
    .map((profile) => {
      const uid = profile.id as string;
      return {
        id: uid,
        display_name: profile.display_name as string,
        username: profile.username as string,
        avatar_url: (profile.avatar_url as string | null) ?? null,
        xbox_gamertag: (profile.xbox_gamertag as string | null) ?? null,
        team_count: countMap.get(uid) ?? 0,
      } satisfies SearchCandidate;
    })
    .slice(0, 10);
}

export async function addTeamMember(input: {
  teamId: string;
  userId: string;
}): Promise<ActionResult> {
  const parsed = addMemberSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const { teamId, userId } = parsed.data;
  const guard = await requireCaptain(teamId);
  if (guard.error || !guard.team || !guard.user) return { error: guard.error };

  const { supabase, team } = guard;

  const { count: memberCount } = await supabase
    .from("team_members")
    .select("*", { count: "exact", head: true })
    .eq("team_id", teamId);

  if ((memberCount ?? 0) >= ((team.max_members as number) ?? 10)) {
    return { error: "A equipe já atingiu o limite máximo de membros." };
  }

  const { count: targetTeamCount } = await supabase
    .from("team_members")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId);

  if ((targetTeamCount ?? 0) >= 1) {
    return { error: "O usuário já participa de uma equipe" };
  }

  // Verifica se já existe um convite pendente
  const { count: pendingInvites } = await supabase
    .from("notifications")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("type", "team_invite")
    .eq("read", false)
    .contains("data", { team_id: teamId });

  if ((pendingInvites ?? 0) > 0) {
    return { error: "Este usuário já tem um convite pendente para esta equipe." };
  }

  // Obter nome de quem está enviando para a mensagem
  const { data: senderProfile } = await supabase
    .from("profiles")
    .select("display_name, username")
    .eq("id", guard.user.id)
    .maybeSingle();

  const senderName = senderProfile?.display_name || senderProfile?.username || "Alguém";

  // Criar notificação
  const { error: notifError } = await supabase
    .from("notifications")
    .insert({
      user_id: userId,
      type: "team_invite",
      title: "Convite de Equipe",
      message: "Você foi convidado(a) por " + senderName + " para participar da equipe " + team.name + ".",
      data: { team_id: teamId },
    });

  if (notifError) {
    return { error: "Não foi possível enviar o convite. Tente novamente." };
  }

  return { success: "Convite enviado com sucesso!" };
}

export async function removeTeamMember(input: {
  teamId: string;
  targetUserId: string;
}): Promise<ActionResult> {
  const parsed = removeMemberSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados invÝ¡lidos." };
  }

  const { teamId, targetUserId } = parsed.data;
  const guard = await requireCaptain(teamId);
  if (guard.error || !guard.team || !guard.user) return { error: guard.error };

  if (targetUserId === guard.user.id) {
    return { error: "VocÝª nÝ£o pode se remover sendo capitÝ£o." };
  }

  const { error } = await guard.supabase
    .from("team_members")
    .delete()
    .eq("team_id", teamId)
    .eq("user_id", targetUserId)
    .neq("role", "captain");

  if (error) {
    return { error: toFriendlyTeamError(error.message) };
  }

  revalidateTeamPaths(teamId);
  return { success: "Membro removido com sucesso." };
}

export async function transferLeadership(input: {
  teamId: string;
  targetUserId: string;
}): Promise<ActionResult> {
  const parsed = transferLeadershipSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados invÝ¡lidos." };
  }

  const { teamId, targetUserId } = parsed.data;
  const guard = await requireCaptain(teamId);
  if (guard.error || !guard.team || !guard.user) return { error: guard.error };

  if (targetUserId === guard.user.id) {
    return { error: "Selecione outro membro para transferir a lideranÝ§a." };
  }

  const { data: member } = await guard.supabase
    .from("team_members")
    .select("user_id")
    .eq("team_id", teamId)
    .eq("user_id", targetUserId)
    .maybeSingle();

  if (!member) {
    return { error: "O usuÝ¡rio selecionado nÝ£o faz parte da equipe." };
  }

  const { error } = await guard.supabase
    .from("teams")
    .update({ captain_id: targetUserId })
    .eq("id", teamId)
    .eq("captain_id", guard.user.id);

  if (error) {
    return { error: toFriendlyTeamError(error.message) };
  }

  revalidateTeamPaths(teamId);
  return { success: "LideranÝ§a transferida com sucesso." };
}

export async function updateTeamSettings(input: {
  teamId: string;
  name: string;
  logo_url?: string;
}): Promise<ActionResult> {
  const parsed = updateSettingsSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados invÝ¡lidos." };
  }

  const { teamId, name, logo_url, max_members } = parsed.data;
  const guard = await requireCaptain(teamId);
  if (guard.error || !guard.team) return { error: guard.error };

  const { data: duplicate } = await guard.supabase
    .from("teams")
    .select("id")
    .ilike("name", name)
    .neq("id", teamId)
    .maybeSingle();

  if (duplicate) {
    return { error: "Este nome de equipe jÝ¡ está¡ em uso" };
  }

  const { error } = await guard.supabase
    .from("teams")
    .update({ name, logo_url: logo_url || null, max_members })
    .eq("id", teamId)
    .eq("captain_id", guard.team.captain_id as string);

  if (error) {
    return { error: toFriendlyTeamError(error.message) };
  }

  revalidateTeamPaths(teamId);
  return { success: "ConfiguraÝ§Ýµes da equipe atualizadas." };
}

export async function dissolveTeam(input: {
  teamId: string;
  confirmName: string;
}): Promise<ActionResult> {
  const parsed = dissolveSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados invÝ¡lidos." };
  }

  const { teamId, confirmName } = parsed.data;
  const guard = await requireCaptain(teamId);
  if (guard.error || !guard.team) return { error: guard.error };

  const currentName = (guard.team.name as string).trim();
  if (currentName !== confirmName.trim()) {
    return { error: "ConfirmaÝ§Ý£o invÝ¡lida. Digite exatamente o nome da equipe." };
  }

  const { error } = await guard.supabase
    .from("team_members")
    .delete()
    .eq("team_id", teamId);

  if (error) {
    return { error: toFriendlyTeamError(error.message) };
  }

  const { error: teamDeleteError } = await guard.supabase
    .from("teams")
    .delete()
    .eq("id", teamId)
    .eq("captain_id", guard.team.captain_id as string);

  if (teamDeleteError) {
    return { error: toFriendlyTeamError(teamDeleteError.message) };
  }

  revalidatePath(`/teams/${teamId}`);
  revalidatePath("/teams");
  revalidatePath("/profile/me");

  return { success: "Equipe apagada com sucesso." };
}

