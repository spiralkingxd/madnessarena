"use client";

import { useEffect, useState } from "react";

import { createClient } from "@/lib/supabase/client";

type Role = "user" | "admin" | "owner";

export function useAdmin() {
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isOwner, setIsOwner] = useState(false);

  useEffect(() => {
    let mounted = true;

    const run = async () => {
      const supabase = createClient();

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!mounted) return;

      if (!user) {
        setIsAdmin(false);
        setIsOwner(false);
        setIsLoading(false);
        return;
      }

      const { data } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle<{ role: Role }>();

      if (!mounted) return;

      const role = data?.role ?? "user";
      setIsOwner(role === "owner");
      setIsAdmin(role === "admin" || role === "owner");
      setIsLoading(false);
    };

    void run();

    return () => {
      mounted = false;
    };
  }, []);

  return { isAdmin, isOwner, isLoading };
}
