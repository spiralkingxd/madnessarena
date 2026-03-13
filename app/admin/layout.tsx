import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { AdminShell } from "@/components/admin/admin-shell";
import { AdminToastProvider } from "@/components/admin/admin-toast";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

type Profile = {
  display_name: string;
  username: string;
  role: "user" | "admin" | "owner";
};

export default async function AdminLayout({ children }: { children: ReactNode }) {
  if (!isSupabaseConfigured()) {
    redirect("/auth/login?next=/admin/dashboard&reason=supabase_not_configured");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login?next=/admin/dashboard");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, username, role")
    .eq("id", user.id)
    .maybeSingle<Profile>();

  if (profile?.role !== "admin" && profile?.role !== "owner") {
    redirect("/");
  }

  const displayName = profile?.display_name || profile?.username || "Administrador";
  const role = profile?.role === "owner" ? "owner" : "admin";

  return (
    <AdminToastProvider>
      <AdminShell displayName={displayName} role={role}>
        {children}
      </AdminShell>
    </AdminToastProvider>
  );
}
