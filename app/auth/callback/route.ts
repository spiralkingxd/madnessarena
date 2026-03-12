import { NextResponse, type NextRequest } from "next/server";

import { createClient } from "@/lib/supabase/server";

function resolveUsername(metadata: Record<string, unknown>, fallback: string) {
  const base =
    (typeof metadata.user_name === "string" && metadata.user_name) ||
    (typeof metadata.preferred_username === "string" && metadata.preferred_username) ||
    (typeof metadata.name === "string" && metadata.name) ||
    fallback;
  const discriminator =
    typeof metadata.discriminator === "string" ? metadata.discriminator : null;

  if (discriminator && discriminator !== "0" && !base.includes("#")) {
    return `${base}#${discriminator}`;
  }

  return base;
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = requestUrl.searchParams.get("next") ?? "/profile/me";

  if (!code) {
    return NextResponse.redirect(new URL("/auth/login?error=missing_code", request.url));
  }

  const supabase = await createClient();
  const {
    data: { session },
    error,
  } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    const errorUrl = new URL("/auth/login", request.url);
    errorUrl.searchParams.set("error", error.message);

    return NextResponse.redirect(errorUrl);
  }

  const user = session?.user;
  if (user) {
    const metadata = (user.user_metadata ?? {}) as Record<string, unknown>;
    const displayName =
      (typeof metadata.full_name === "string" && metadata.full_name) ||
      (typeof metadata.name === "string" && metadata.name) ||
      (typeof metadata.global_name === "string" && metadata.global_name) ||
      user.email?.split("@")[0] ||
      "Pirata";
    const username = resolveUsername(metadata, displayName);
    const avatarUrl =
      typeof metadata.avatar_url === "string" ? metadata.avatar_url : null;

    console.log(`[auth/callback] Usuário autenticado: ${user.id}`);
    console.log("[auth/callback] Tentando criar/atualizar profile...");

    const { error: profileError } = await supabase
      .from("profiles")
      .upsert(
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

    if (profileError) {
      console.error("[auth/callback] Erro ao criar profile:", profileError);
    } else {
      console.log("[auth/callback] Profile criado com sucesso");
    }

    const accessToken = session?.provider_token ?? null;
    if (typeof accessToken === "string" && accessToken.length > 0) {
      try {
        const connectionsResponse = await fetch("https://discord.com/api/users/@me/connections", {
          headers: { Authorization: `Bearer ${accessToken}` },
          cache: "no-store",
        });

        if (connectionsResponse.ok) {
          const connections = (await connectionsResponse.json()) as Array<{
            type?: string;
            name?: string;
            id?: string;
          }>;
          const xboxConnection = connections.find((c) => c.type === "xbox");

          if (xboxConnection) {
            const xboxGamertag = xboxConnection.name ?? xboxConnection.id ?? null;
            await supabase
              .from("profiles")
              .update({
                xbox_gamertag: xboxGamertag,
                updated_at: new Date().toISOString(),
              })
              .eq("id", user.id);
          }
        }
      } catch (connectionsError) {
        console.error("[auth/callback] Falha ao sincronizar conexões do Discord:", connectionsError);
      }
    }
  }

  console.log(`[auth/callback] Redirecionando para: ${next}`);

  return NextResponse.redirect(new URL(next, request.url));
}