import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

type Props = {
  searchParams: Promise<{ from?: string }>;
};

export default async function MyTeamRedirectPage({ searchParams }: Props) {
  const supabase = await createClient();
  const query = await searchParams;
  const from = query?.from === "profile" ? "profile" : "teams";
  const backQuery = `?back=${from}`;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/auth/login?next=/my-team${encodeURIComponent(`?from=${from}`)}`);
  }

  const { data: memberships } = await supabase
    .from("team_members")
    .select("team_id, role, joined_at")
    .eq("user_id", user.id)
    .order("joined_at", { ascending: true })
    .limit(1);

  const membership = (memberships?.[0] as { team_id: string; role: "captain" | "member"; joined_at: string } | undefined) ?? null;

  if (membership?.team_id) {
    redirect(`/teams/${membership.team_id}${backQuery}`);
  }

  const { data: captainTeam } = await supabase
    .from("teams")
    .select("id")
    .eq("captain_id", user.id)
    .is("dissolved_at", null)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle<{ id: string }>();

  if (captainTeam?.id) {
    redirect(`/teams/${captainTeam.id}${backQuery}`);
  }

  if (from === "profile") {
    redirect("/profile/me?action=team-choice#teams");
  }

  redirect(`/teams${backQuery}`);
}
