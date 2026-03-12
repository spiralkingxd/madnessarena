import { redirect } from "next/navigation";
import Image from "next/image";

import { upsertProfileFromOAuth } from "@/lib/auth/profile";
import { createClient } from "@/lib/supabase/server";

type ProfileRow = {
  id: string;
  discord_id: string | null;
  display_name: string;
  username: string;
  email: string | null;
  xbox_gamertag: string | null;
  avatar_url: string | null;
  created_at: string;
};

export default async function MyProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login?next=/profile/me");
  }

  let { data: profile } = await supabase
    .from("profiles")
    .select("id, discord_id, display_name, username, email, xbox_gamertag, avatar_url, created_at")
    .eq("id", user.id)
    .maybeSingle<ProfileRow>();

  if (!profile) {
    await upsertProfileFromOAuth();

    const { data: recoveredProfile } = await supabase
      .from("profiles")
      .select("id, discord_id, display_name, username, email, xbox_gamertag, avatar_url, created_at")
      .eq("id", user.id)
      .maybeSingle<ProfileRow>();

    profile = recoveredProfile;
  }

  if (!profile) {
    redirect("/");
  }

  return (

    <main className="min-h-[calc(100vh-72px)] bg-[radial-gradient(circle_at_top,_#13293d_0%,_#0b1826_40%,_#050b12_100%)] px-6 py-12 text-slate-100">
      <section className="mx-auto w-full max-w-3xl rounded-3xl border border-white/10 bg-slate-950/60 p-8 shadow-2xl shadow-black/30">
        <h1 className="text-3xl font-semibold text-white">Meu Perfil</h1>
        <p className="mt-2 text-sm text-slate-300">
          Dados sincronizados do Discord e integração de Xbox no momento do login.
        </p>

        <div className="mt-8 space-y-6">
          <div>
            <p className="mb-2 text-sm font-medium text-slate-200">Avatar</p>
            <div className="relative h-24 w-24 overflow-hidden rounded-2xl border border-white/10 bg-black/20">
              {profile.avatar_url ? (
                <Image src={profile.avatar_url} alt={profile.display_name} fill sizes="96px" className="object-cover" />
              ) : (
                <span className="flex h-full w-full items-center justify-center text-xl font-semibold text-cyan-200">
                  {(profile.display_name ?? "J").slice(0, 1).toUpperCase()}
                </span>
              )}
            </div>
          </div>

          <ReadOnlyField label="Nome de exibição" value={profile.display_name} />
          <ReadOnlyField label="Username" value={profile.username} />
          <ReadOnlyField label="Email" value={profile.email ?? "-"} />
          <ReadOnlyField label="Discord ID" value={profile.discord_id ?? "-"} />
          <ReadOnlyField label="Xbox Gamertag" value={profile.xbox_gamertag ?? "Sem conexão Xbox no Discord"} />
          <ReadOnlyField label="Avatar URL" value={profile.avatar_url ?? "-"} />
        </div>
      </section>
    </main>
  );
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="mb-2 text-sm font-medium text-slate-200">{label}</p>
      <p className="rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-slate-100">{value}</p>
    </div>
  );
}