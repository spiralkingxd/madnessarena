import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

import { getSupabaseEnv, isSupabaseConfigured } from "@/lib/supabase/env";

const PRIVATE_PATH_PREFIXES = ["/profile/me"];
const ADMIN_PATH_PREFIX = "/admin";

export async function updateSession(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const isPrivatePath = PRIVATE_PATH_PREFIXES.some((prefix) => pathname.startsWith(prefix));
  const isAdminPath = pathname.startsWith(ADMIN_PATH_PREFIX);

  if (!isSupabaseConfigured()) {
    if (isPrivatePath || isAdminPath) {
      const loginUrl = new URL("/auth/login", request.url);
      loginUrl.searchParams.set("next", pathname);
      loginUrl.searchParams.set("reason", "supabase_not_configured");

      return NextResponse.redirect(loginUrl);
    }

    return NextResponse.next({ request });
  }

  try {
    let response = NextResponse.next({ request });

    const { supabaseAnonKey, supabaseUrl } = getSupabaseEnv();

    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
            response.cookies.set(name, value, options);
          });
        },
      },
    });

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user && (isPrivatePath || isAdminPath)) {
      const loginUrl = new URL("/auth/login", request.url);
      loginUrl.searchParams.set("next", pathname);

      return NextResponse.redirect(loginUrl);
    }

    if (user && (isPrivatePath || isAdminPath)) {
      const { data: existingProfile } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", user.id)
        .maybeSingle();

      if (!existingProfile) {
        const metadata = user.user_metadata ?? {};
        const displayName =
          metadata.full_name ?? metadata.name ?? metadata.global_name ?? user.email?.split("@")[0] ?? "Pirata";
        const username = metadata.user_name ?? metadata.preferred_username ?? metadata.name ?? displayName;
        const avatarUrl = metadata.avatar_url ?? null;

        await supabase.from("profiles").upsert(
          {
            id: user.id,
            discord_id: user.id,
            display_name: displayName,
            username,
            email: user.email ?? null,
            avatar_url: avatarUrl,
            xbox_gamertag: null,
            role: "user",
            updated_at: new Date().toISOString(),
          },
          { onConflict: "id" },
        );
      }
    }

    if (user && isAdminPath) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

      if (profile?.role !== "admin") {
        return NextResponse.redirect(new URL("/", request.url));
      }
    }

    return response;
  } catch {
    // Em caso de erro inesperado (ex.: timeout ou variável ausente),
    // rotas protegidas redirecionam para login; demais seguem normalmente.
    if (isPrivatePath || isAdminPath) {
      const loginUrl = new URL("/auth/login", request.url);
      loginUrl.searchParams.set("next", pathname);
      return NextResponse.redirect(loginUrl);
    }

    return NextResponse.next({ request });
  }
}