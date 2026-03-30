"use client";

import type { BracketMatchRow } from "@/app/admin/matches/_data";
import { cn } from "@/lib/utils";

interface TeamRowProps {
  id: string | null;
  displayName: string;
  logoUrl: string | null;
  scoreToken: string;
  isWinner: boolean;
}

function TeamRow({ id, displayName, logoUrl, scoreToken, isWinner }: TeamRowProps) {
  const isPending = !id;
  const accentClass =
    displayName === "—" || displayName === "A definir"
      ? "bg-slate-400"
      : isWinner
        ? "bg-lime-500"
        : "bg-slate-900";

  return (
    <div className="relative flex items-center gap-2 rounded-[2px] bg-[#d8d8d8] px-3 py-2 pl-4">
      <span className={cn("absolute left-0 top-0 h-full w-[6px]", accentClass)} aria-hidden="true" />

      {isPending ? (
        <span className="h-6 w-6 flex-shrink-0" aria-hidden="true" />
      ) : logoUrl ? (
        <img
          src={logoUrl}
          alt={`Logo ${displayName}`}
          className="h-6 w-6 flex-shrink-0 rounded-sm object-cover"
          loading="lazy"
          decoding="async"
        />
      ) : (
        <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-sm bg-slate-300 text-[10px] font-semibold uppercase text-slate-700">
          {displayName.charAt(0)}
        </span>
      )}

      <span
        className={cn(
          "min-w-0 flex-1 truncate text-[13px] md:text-sm leading-tight uppercase tracking-wide",
          displayName === "—" || displayName === "A definir"
            ? "text-slate-500"
            : isWinner
              ? "font-medium text-slate-900"
              : "font-medium text-slate-800",
        )}
      >
        {displayName}
      </span>

      <span
        className={cn(
          "min-w-[1.75rem] text-right text-[13px] md:text-sm tabular-nums uppercase",
          scoreToken === "—" || scoreToken.toLowerCase() === "vs"
            ? "text-slate-500"
            : isWinner
              ? "font-semibold text-slate-900"
              : "font-medium text-slate-700",
        )}
      >
        {scoreToken}
      </span>
    </div>
  );
}

export interface MatchCardProps {
  match: BracketMatchRow;
  isFinal?: boolean;
  showDate?: boolean;
  widthClass?: string;
  onClick?: (matchId: string) => void;
  className?: string;
}

export function MatchCard({
  match,
  isFinal = false,
  widthClass = "w-[152px] md:w-[172px] lg:w-[196px]",
  onClick,
  className,
}: MatchCardProps) {
  const showNumericScore = match.status === "finished" || match.status === "in_progress";
  const isByeMatch = Boolean(match.winner_id && (!match.team_a_id || !match.team_b_id));

  const aDisplayName = match.team_a_id ? match.team_a_name : isByeMatch ? "—" : "A definir";
  const bDisplayName = match.team_b_id ? match.team_b_name : isByeMatch ? "—" : "A definir";

  function getScoreToken(teamId: string | null, score: number): string {
    if (isByeMatch) return teamId ? "Bye" : "—";
    if (showNumericScore && teamId) return String(score);
    if (match.status === "pending" && (match.team_a_id || match.team_b_id)) return "vs";
    return "—";
  }

  const teamAIsWinner = Boolean(match.winner_id && match.winner_id === match.team_a_id);
  const teamBIsWinner = Boolean(match.winner_id && match.winner_id === match.team_b_id);

  return (
    <article
      className={cn(
        "relative flex flex-col gap-2 bg-transparent",
        onClick && "cursor-pointer",
        widthClass,
        className,
      )}
      onClick={() => onClick?.(match.id)}
    >
      {isFinal && (
        <span className="pointer-events-none absolute -top-3 right-0 text-[9px] uppercase tracking-wider text-slate-500">
          Final
        </span>
      )}

      <TeamRow
        id={match.team_a_id}
        displayName={aDisplayName}
        logoUrl={match.team_a_logo_url}
        scoreToken={getScoreToken(match.team_a_id, match.score_a)}
        isWinner={teamAIsWinner}
      />

      <div className="h-px bg-slate-500/60" />

      <TeamRow
        id={match.team_b_id}
        displayName={bDisplayName}
        logoUrl={match.team_b_logo_url}
        scoreToken={getScoreToken(match.team_b_id, match.score_b)}
        isWinner={teamBIsWinner}
      />
    </article>
  );
}
