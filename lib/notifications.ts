import type { SupabaseClient } from "@supabase/supabase-js";

import { createAdminClient } from "@/lib/supabase/admin";

export type NotificationInsert = {
  user_id: string;
  type: string;
  title: string;
  message: string;
  data?: Record<string, unknown> | null;
  read?: boolean;
};

export async function insertNotifications(
  supabase: SupabaseClient,
  payload: NotificationInsert | NotificationInsert[],
) {
  const items = Array.isArray(payload) ? payload : [payload];
  if (items.length === 0) return { success: true as const };

  const { error } = await supabase.from("notifications").insert(items);
  if (!error) return { success: true as const };

  const admin = createAdminClient();
  if (!admin) {
    return { success: false as const, error: error.message };
  }

  const { error: adminError } = await admin.from("notifications").insert(items);
  if (adminError) {
    return { success: false as const, error: adminError.message };
  }

  return { success: true as const };
}
