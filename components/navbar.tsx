import Link from "next/link";
import { cookies } from "next/headers";
import { Suspense } from "react";

import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { NavLinks } from "@/components/nav-links";
import { ThemeToggle } from "@/components/theme-toggle";
import { GlobalSearch } from "@/components/global-search";
import { UserDropdown } from "@/components/user-dropdown";
import { UserDropdownSkeleton } from "@/components/user-dropdown-skeleton";
import { upsertProfileFromOAuth } from "@/lib/auth/profile";

type ProfileNavbarRow = {
  display_name: string;
  username: string;
  avatar_url: string | null;
  xbox_gamertag: string | null;
  role: "user" | "admin" | "owner";
};

const PROFILE_SELECT =
  "display_name, username, avatar_url, xbox_gamertag, role";

async function UserSection() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let profile: ProfileNavbarRow | null = null;
  let teamsCount = 0;

  if (user) {
    const [{ data }, { count }] = await Promise.all([
      supabase
        .from("profiles")
        .select(PROFILE_SELECT)
        .eq("id", user.id)
        .maybeSingle(),
      supabase
        .from("team_members")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id),
    ]);

    profile = data;
    teamsCount = count ?? 0;

    if (!profile) {
      await upsertProfileFromOAuth();

      const { data: syncedProfile } = await supabase
        .from("profiles")
        .select(PROFILE_SELECT)
        .eq("id", user.id)
        .maybeSingle();

      profile = syncedProfile;
    }
  }

  const avatarUrl =
    profile?.avatar_url ?? user?.user_metadata?.avatar_url ?? null;
  const nickname =
    profile?.display_name ?? profile?.username ?? user?.email ?? "Jogador";

  if (!user) {
    return (
      <Link
        href="/auth/login"
        className="action-primary inline-flex items-center rounded-xl px-4 py-2 text-sm font-semibold transition"
      >
        Login com Discord
      </Link>
    );
  }

  return (
    <UserDropdown
      nickname={nickname}
      username={profile?.username ?? null}
      avatarUrl={avatarUrl}
      xboxGamertag={profile?.xbox_gamertag ?? null}
      teamsCount={teamsCount}
      role={profile?.role}
    />
  );
}

export async function Navbar() {
  const isConfigured = isSupabaseConfigured();

  let hasAuthCookie = false;
  
  if (isConfigured) {
    const cookieStore = await cookies();
    hasAuthCookie = cookieStore
      .getAll()
      .some((cookie) => cookie.name.includes("-auth-token"));
  }

  return (
    <header className="site-topbar sticky top-0 z-50">
      <div className="relative mx-auto flex h-[72px] w-full max-w-7xl items-center justify-between gap-4 px-6 lg:px-10">
        <Link
          href="/"
          className="shrink-0 text-[15px] md:text-base font-black uppercase tracking-[0.25em] bg-gradient-to-r from-cyan-400 via-sky-400 to-blue-500 bg-clip-text text-transparent transition-transform hover:scale-[1.03] drop-shadow-sm"
        >
          Madness Arena
        </Link>

        <NavLinks />

        <div className="flex shrink-0 items-center gap-2">
          <GlobalSearch /> <ThemeToggle />
          
          {!isConfigured ? (
            <Link
              href="/auth/login"
              className="action-primary inline-flex items-center rounded-xl px-4 py-2 text-sm font-semibold transition"
            >
              Login com Discord
            </Link>
          ) : hasAuthCookie ? (
            <Suspense fallback={<UserDropdownSkeleton />}>
              <UserSection />
            </Suspense>
          ) : (
            <Link
              href="/auth/login"
              className="action-primary inline-flex items-center rounded-xl px-4 py-2 text-sm font-semibold transition"
            >
              Login com Discord
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
