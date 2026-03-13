"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { assertAdminAccess, enforceAdminRateLimit, logAdminAction } from "@/app/admin/_lib";
import { queueOrSendDiscordNotification } from "@/lib/discord-notifications";

type ActionResult = { success?: string; error?: string };

const updateRoleSchema = z.object({
  userId: z.string().uuid(),
  newRole: z.enum(["user", "admin"]),
});

const banSchema = z.object({
  userId: z.string().uuid(),
  reason: z.string().min(2).max(400),
});

const bulkSchema = z.object({
  action: z.enum(["promote", "demote", "ban"]),
  memberIds: z.array(z.string().uuid()).min(1),
  reason: z.string().optional(),
});

function revalidateMemberPaths(memberId?: string) {
  revalidatePath("/admin/members");
  revalidatePath("/admin/dashboard");
  revalidatePath("/profile/me");
  if (memberId) {
    revalidatePath(`/admin/members/${memberId}`);
  }
}

export async function updateMemberRole(userId: string, newRole: "user" | "admin"): Promise<ActionResult> {
  const parsed = updateRoleSchema.safeParse({ userId, newRole });
  if (!parsed.success) return { error: "Dados inválidos." };

  try {
    const { supabase, adminId, role } = await assertAdminAccess();
    await enforceAdminRateLimit(supabase, adminId, "update_member_role");

    const { data: target } = await supabase
      .from("profiles")
      .select("id, role")
      .eq("id", parsed.data.userId)
      .maybeSingle<{ id: string; role: "user" | "admin" | "owner" }>();

    if (!target) return { error: "Usuário não encontrado." };
    if (target.role === "owner") return { error: "Conta owner não pode ser alterada." };
    if (parsed.data.userId === adminId && role === "admin" && parsed.data.newRole === "user") {
      return { error: "Você não pode remover seu próprio acesso de admin." };
    }

    const { error } = await supabase
      .from("profiles")
      .update({ role: parsed.data.newRole, updated_at: new Date().toISOString() })
      .eq("id", parsed.data.userId);

    if (error) return { error: "Não foi possível atualizar a role." };

    await logAdminAction(supabase, {
      adminId,
      action: "update_member_role",
      targetType: "profile",
      targetId: parsed.data.userId,
      details: { newRole: parsed.data.newRole },
    });

    revalidateMemberPaths(parsed.data.userId);
    return { success: "Role atualizada com sucesso." };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Falha ao atualizar role." };
  }
}

export async function banMember(userId: string, reason: string): Promise<ActionResult> {
  const parsed = banSchema.safeParse({ userId, reason });
  if (!parsed.success) return { error: "Dados inválidos." };

  try {
    const { supabase, adminId } = await assertAdminAccess();
    await enforceAdminRateLimit(supabase, adminId, "ban_member");

    const { data: target } = await supabase
      .from("profiles")
      .select("id, role")
      .eq("id", parsed.data.userId)
      .maybeSingle<{ id: string; role: "user" | "admin" | "owner" }>();

    if (!target) return { error: "Usuário não encontrado." };
    if (target.role === "owner") return { error: "Conta owner não pode ser banida." };

    const { error } = await supabase
      .from("profiles")
      .update({
        is_banned: true,
        banned_reason: parsed.data.reason,
        banned_at: new Date().toISOString(),
        banned_by: adminId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", parsed.data.userId);

    if (error) return { error: "Não foi possível banir o usuário." };

    await logAdminAction(supabase, {
      adminId,
      action: "ban_member",
      targetType: "profile",
      targetId: parsed.data.userId,
      details: { reason: parsed.data.reason },
      severity: "warning",
      suspicious: true,
    });

    await queueOrSendDiscordNotification({
      supabase,
      createdBy: adminId,
      type: "user_banned",
      data: {
        userId: parsed.data.userId,
        reason: parsed.data.reason,
      },
    });

    revalidateMemberPaths(parsed.data.userId);
    return { success: "Usuário banido com sucesso." };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Falha ao banir usuário." };
  }
}

export async function bulkManageMembers(formData: FormData): Promise<ActionResult> {
  const action = String(formData.get("bulk_action") ?? "");
  const reason = String(formData.get("bulk_reason") ?? "").trim();
  const memberIds = formData
    .getAll("member_ids")
    .map((id) => String(id))
    .filter(Boolean);

  const parsed = bulkSchema.safeParse({ action, memberIds, reason: reason || undefined });
  if (!parsed.success) return { error: "Selecione membros e ação válida." };

  try {
    const { supabase, adminId } = await assertAdminAccess();
    await enforceAdminRateLimit(supabase, adminId, "bulk_member_action");

    if (parsed.data.action === "ban" && (!parsed.data.reason || parsed.data.reason.length < 2)) {
      return { error: "Informe um motivo para banimento em lote." };
    }

    if (parsed.data.action === "promote" || parsed.data.action === "demote") {
      const newRole = parsed.data.action === "promote" ? "admin" : "user";
      const { error } = await supabase
        .from("profiles")
        .update({ role: newRole, updated_at: new Date().toISOString() })
        .in("id", parsed.data.memberIds)
        .neq("role", "owner");

      if (error) return { error: "Não foi possível aplicar ação em lote." };
    }

    if (parsed.data.action === "ban") {
      const { error } = await supabase
        .from("profiles")
        .update({
          is_banned: true,
          banned_reason: parsed.data.reason,
          banned_at: new Date().toISOString(),
          banned_by: adminId,
          updated_at: new Date().toISOString(),
        })
        .in("id", parsed.data.memberIds)
        .neq("role", "owner");

      if (error) return { error: "Não foi possível banir em lote." };
    }

    await logAdminAction(supabase, {
      adminId,
      action: "bulk_member_action",
      targetType: "profile",
      details: { action: parsed.data.action, total: parsed.data.memberIds.length },
    });

    if (parsed.data.action === "ban") {
      await queueOrSendDiscordNotification({
        supabase,
        createdBy: adminId,
        type: "user_banned",
        data: {
          userId: `bulk:${parsed.data.memberIds.length}`,
          reason: parsed.data.reason ?? "Banimento em lote",
        },
      });
    }

    revalidateMemberPaths();
    return { success: "Ação em lote executada com sucesso." };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Falha na ação em lote." };
  }
}
