import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

function csvCell(value: unknown) {
  return `"${String(value ?? "").replaceAll("\"", "\"\"")}"`;
}

function xmlEscape(value: unknown) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

type Role = "user" | "admin" | "owner";

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle<{ role: Role }>();

  if (profile?.role !== "admin" && profile?.role !== "owner") {
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  }

  const url = new URL(request.url);
  const scope = (url.searchParams.get("scope") ?? "players").toLowerCase();
  const format = (url.searchParams.get("format") ?? "csv").toLowerCase();

  if (scope === "teams") {
    const [{ data: rankings }, { data: teams }, { data: profiles }] = await Promise.all([
      supabase.from("team_rankings").select("team_id, points, wins, losses, rank_position"),
      supabase.from("teams").select("id, name, captain_id"),
      supabase.from("profiles").select("id, display_name, username"),
    ]);

    const teamMap = new Map<string, { name: string; captainId: string }>();
    for (const row of teams ?? []) {
      teamMap.set(String(row.id), {
        name: String(row.name),
        captainId: String(row.captain_id),
      });
    }

    const profileMap = new Map<string, string>();
    for (const row of profiles ?? []) {
      profileMap.set(String(row.id), String(row.display_name ?? row.username ?? "Capitao"));
    }

    const rows = (rankings ?? [])
      .map((row) => {
        const team = teamMap.get(String(row.team_id));
        const wins = Number(row.wins ?? 0);
        const losses = Number(row.losses ?? 0);
        const total = wins + losses;
        return {
          rank: Number(row.rank_position ?? 9999),
          team_name: team?.name ?? "Equipe removida",
          captain_name: team ? profileMap.get(team.captainId) ?? "Capitao" : "Capitao",
          points: Number(row.points ?? 0),
          wins,
          losses,
          win_rate: total > 0 ? ((wins / total) * 100).toFixed(1) : "0.0",
        };
      })
      .sort((a, b) => a.rank - b.rank || b.points - a.points);

    if (format === "svg") {
      const width = 1280;
      const rowHeight = 36;
      const baseY = 140;
      const visibleRows = rows.slice(0, 20);
      const height = baseY + visibleRows.length * rowHeight + 70;

      const lineSvg = visibleRows
        .map((row, index) => {
          const y = baseY + index * rowHeight;
          return `<text x="56" y="${y}" fill="#e2e8f0" font-size="16" font-family="Verdana, sans-serif">#${row.rank}</text>
<text x="140" y="${y}" fill="#f8fafc" font-size="16" font-family="Verdana, sans-serif">${xmlEscape(row.team_name)}</text>
<text x="540" y="${y}" fill="#cbd5e1" font-size="16" font-family="Verdana, sans-serif">${xmlEscape(row.captain_name)}</text>
<text x="860" y="${y}" fill="#facc15" font-size="16" font-family="Verdana, sans-serif">${row.points}</text>
<text x="1000" y="${y}" fill="#cbd5e1" font-size="16" font-family="Verdana, sans-serif">${row.wins}</text>
<text x="1080" y="${y}" fill="#cbd5e1" font-size="16" font-family="Verdana, sans-serif">${row.losses}</text>
<text x="1160" y="${y}" fill="#cbd5e1" font-size="16" font-family="Verdana, sans-serif">${row.win_rate}%</text>`;
        })
        .join("\n");

      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
<rect width="100%" height="100%" fill="#020617"/>
<text x="48" y="56" fill="#e2e8f0" font-size="34" font-family="Verdana, sans-serif" font-weight="700">Ranking de Equipes</text>
<text x="48" y="86" fill="#94a3b8" font-size="16" font-family="Verdana, sans-serif">Exportado em ${xmlEscape(new Date().toLocaleString("pt-BR"))}</text>
<text x="56" y="116" fill="#94a3b8" font-size="13" font-family="Verdana, sans-serif">Pos</text>
<text x="140" y="116" fill="#94a3b8" font-size="13" font-family="Verdana, sans-serif">Equipe</text>
<text x="540" y="116" fill="#94a3b8" font-size="13" font-family="Verdana, sans-serif">Capitao</text>
<text x="860" y="116" fill="#94a3b8" font-size="13" font-family="Verdana, sans-serif">Pontos</text>
<text x="1000" y="116" fill="#94a3b8" font-size="13" font-family="Verdana, sans-serif">W</text>
<text x="1080" y="116" fill="#94a3b8" font-size="13" font-family="Verdana, sans-serif">L</text>
<text x="1160" y="116" fill="#94a3b8" font-size="13" font-family="Verdana, sans-serif">Win%</text>
${lineSvg}
</svg>`;

      return new NextResponse(svg, {
        headers: {
          "content-type": "image/svg+xml; charset=utf-8",
          "content-disposition": "attachment; filename=rankings-teams.svg",
        },
      });
    }

    if (format === "json") {
      return NextResponse.json(rows, {
        headers: {
          "content-disposition": "attachment; filename=rankings-teams.json",
        },
      });
    }

    const lines = [
      "rank,team_name,captain_name,points,wins,losses,win_rate",
      ...rows.map((row) => [row.rank, row.team_name, row.captain_name, row.points, row.wins, row.losses, row.win_rate].map(csvCell).join(",")),
    ];

    return new NextResponse(lines.join("\n"), {
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": "attachment; filename=rankings-teams.csv",
      },
    });
  }

  const { data: rankings } = await supabase
    .from("rankings")
    .select("profile_id, points, wins, losses, rank_position")
    .order("rank_position", { ascending: true });

  const profileIds = (rankings ?? []).map((row) => String(row.profile_id));
  const { data: profiles } = profileIds.length
    ? await supabase.from("profiles").select("id, display_name, username, xbox_gamertag").in("id", profileIds)
    : { data: [] as Array<{ id: string; display_name: string | null; username: string | null; xbox_gamertag: string | null }> };

  const profileMap = new Map<string, { name: string; xbox: string | null }>();
  for (const row of profiles ?? []) {
    profileMap.set(String(row.id), {
      name: String(row.display_name ?? row.username ?? "Jogador"),
      xbox: (row.xbox_gamertag as string | null) ?? null,
    });
  }

  const rows = (rankings ?? [])
    .map((row) => {
      const profile = profileMap.get(String(row.profile_id));
      const wins = Number(row.wins ?? 0);
      const losses = Number(row.losses ?? 0);
      const total = wins + losses;
      return {
        rank: Number(row.rank_position ?? 9999),
        name: profile?.name ?? "Jogador removido",
        xbox: profile?.xbox ?? "",
        points: Number(row.points ?? 0),
        wins,
        losses,
        win_rate: total > 0 ? ((wins / total) * 100).toFixed(1) : "0.0",
      };
    })
    .sort((a, b) => a.rank - b.rank || b.points - a.points);

  if (format === "svg") {
    const width = 1280;
    const rowHeight = 36;
    const baseY = 140;
    const visibleRows = rows.slice(0, 20);
    const height = baseY + visibleRows.length * rowHeight + 70;

    const lineSvg = visibleRows
      .map((row, index) => {
        const y = baseY + index * rowHeight;
        return `<text x="56" y="${y}" fill="#e2e8f0" font-size="16" font-family="Verdana, sans-serif">#${row.rank}</text>
<text x="140" y="${y}" fill="#f8fafc" font-size="16" font-family="Verdana, sans-serif">${xmlEscape(row.name)}</text>
<text x="560" y="${y}" fill="#cbd5e1" font-size="16" font-family="Verdana, sans-serif">${xmlEscape(row.xbox)}</text>
<text x="860" y="${y}" fill="#facc15" font-size="16" font-family="Verdana, sans-serif">${row.points}</text>
<text x="1000" y="${y}" fill="#cbd5e1" font-size="16" font-family="Verdana, sans-serif">${row.wins}</text>
<text x="1080" y="${y}" fill="#cbd5e1" font-size="16" font-family="Verdana, sans-serif">${row.losses}</text>
<text x="1160" y="${y}" fill="#cbd5e1" font-size="16" font-family="Verdana, sans-serif">${row.win_rate}%</text>`;
      })
      .join("\n");

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
<rect width="100%" height="100%" fill="#020617"/>
<text x="48" y="56" fill="#e2e8f0" font-size="34" font-family="Verdana, sans-serif" font-weight="700">Ranking de Jogadores</text>
<text x="48" y="86" fill="#94a3b8" font-size="16" font-family="Verdana, sans-serif">Exportado em ${xmlEscape(new Date().toLocaleString("pt-BR"))}</text>
<text x="56" y="116" fill="#94a3b8" font-size="13" font-family="Verdana, sans-serif">Pos</text>
<text x="140" y="116" fill="#94a3b8" font-size="13" font-family="Verdana, sans-serif">Jogador</text>
<text x="560" y="116" fill="#94a3b8" font-size="13" font-family="Verdana, sans-serif">Xbox</text>
<text x="860" y="116" fill="#94a3b8" font-size="13" font-family="Verdana, sans-serif">Pontos</text>
<text x="1000" y="116" fill="#94a3b8" font-size="13" font-family="Verdana, sans-serif">W</text>
<text x="1080" y="116" fill="#94a3b8" font-size="13" font-family="Verdana, sans-serif">L</text>
<text x="1160" y="116" fill="#94a3b8" font-size="13" font-family="Verdana, sans-serif">Win%</text>
${lineSvg}
</svg>`;

    return new NextResponse(svg, {
      headers: {
        "content-type": "image/svg+xml; charset=utf-8",
        "content-disposition": "attachment; filename=rankings-players.svg",
      },
    });
  }

  if (format === "json") {
    return NextResponse.json(rows, {
      headers: {
        "content-disposition": "attachment; filename=rankings-players.json",
      },
    });
  }

  const lines = [
    "rank,name,xbox,points,wins,losses,win_rate",
    ...rows.map((row) => [row.rank, row.name, row.xbox, row.points, row.wins, row.losses, row.win_rate].map(csvCell).join(",")),
  ];

  return new NextResponse(lines.join("\n"), {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": "attachment; filename=rankings-players.csv",
    },
  });
}
