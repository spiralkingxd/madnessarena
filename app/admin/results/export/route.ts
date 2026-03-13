import { NextResponse } from "next/server";

import { assertAdminAccess } from "@/app/admin/_lib";
import { getResultsData } from "@/app/admin/matches/_data";

export async function GET(request: Request) {
  try {
    await assertAdminAccess();
    const url = new URL(request.url);
    const format = url.searchParams.get("format") === "json" ? "json" : "csv";

    const rows = await getResultsData();

    if (format === "json") {
      return NextResponse.json(rows, {
        status: 200,
        headers: {
          "Content-Disposition": "attachment; filename=results.json",
        },
      });
    }

    const header = ["match_id", "event_id", "event_title", "round", "team_a", "team_b", "score_a", "score_b", "winner", "ended_at", "updated_at"];
    const lines = [header.join(",")];
    for (const row of rows) {
      lines.push([
        row.id,
        row.event_id,
        row.event_title,
        row.round,
        row.team_a_name,
        row.team_b_name,
        row.score_a,
        row.score_b,
        row.winner_name,
        row.ended_at ?? "",
        row.updated_at,
      ].map((value) => `"${String(value).replaceAll('"', '""')}"`).join(","));
    }

    return new NextResponse(lines.join("\n"), {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": "attachment; filename=results.csv",
      },
    });
  } catch {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
}
