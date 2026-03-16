"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type Notification = {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  data: any;
  read: boolean;
  created_at: string;
};

export async function getNotifications() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { data: [], error: "Não autenticado" };

  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) {
    return { data: [], error: error.message };
  }

  return { data: data as Notification[], error: null };
}

export async function markAsRead(notificationId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { success: false };

  const { error } = await supabase
    .from("notifications")
    .update({ read: true })
    .eq("id", notificationId)
    .eq("user_id", user.id);

  if (!error) {
    revalidatePath("/");
    return { success: true };
  }
  return { success: false };
}

export async function markAllAsRead() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { success: false };

  const { error } = await supabase
    .from("notifications")
    .update({ read: true })
    .eq("user_id", user.id)
    .eq("read", false);

  if (!error) {
    revalidatePath("/");
    return { success: true };
  }
  return { success: false };
}

export async function processInviteAction(notificationId: string, action: "accept" | "decline", teamId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { error: "Não autenticado" };

  // Marcar como lido independentemente da ação
  await supabase.from("notifications").update({ read: true }).eq("id", notificationId);

  if (action === "accept") {
    // 1. Verifica se já está no limite de equipes
    const { count } = await supabase
      .from("team_members")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id);

    if (count && count >= 1) { // Supondo limite de 1
      return { error: "Você já possui uma equipe. Saia da equipe atual antes de aceitar." };
    }

    // 2. Insere no time
    const { error: insertErr } = await supabase
      .from("team_members")
      .insert({ team_id: teamId, user_id: user.id, role: "member" });

    if (insertErr) {
      return { error: insertErr.message.includes("duplicate") ? "Você já está nesta equipe." : "Erro ao aceitar convite." };
    }
  }

  // Se for decline, apenas foi marcado como lido
  revalidatePath("/profile/me");
  revalidatePath("/teams");
  return { success: "Ação processada com sucesso!" };
}
