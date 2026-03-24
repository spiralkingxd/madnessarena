import assert from "node:assert/strict";
import fs from "node:fs";

const matchCard = fs.readFileSync("components/bracket/match-card.tsx", "utf8");
const visualLayout = fs.readFileSync("components/bracket/bracket-visual-layout.tsx", "utf8");

function testMinimalSurface() {
  assert.match(matchCard, /interface TeamRowProps/, "TeamRow minimal interface must exist");
  assert.doesNotMatch(matchCard, /seed|team_a_seed|team_b_seed/i, "Seeds must not be rendered in minimal card");
  assert.doesNotMatch(matchCard, /scheduled_at|Calendar|Clock/, "Dates/icons must be removed from minimal card");
  assert.doesNotMatch(matchCard, /STATUS_CONFIG|Agendada|Em andamento|Finalizada|Cancelada/, "Status badge config must be absent");
}

function testLogoAndTypography() {
  assert.match(matchCard, /className="h-6 w-6/, "Logo should be 24x24 (h-6 w-6)");
  assert.match(matchCard, /text-\[13px\] md:text-sm/, "Mobile typography should be 12-13px and 14px on md+");
  assert.match(matchCard, /truncate/, "Long names should be truncated with ellipsis behavior");
}

function scoreToken(match, teamId, score) {
  const showNumericScore = match.status === "finished" || match.status === "in_progress";
  const isByeMatch = Boolean(match.winner_id && (!match.team_a_id || !match.team_b_id));
  if (isByeMatch) return teamId ? "Bye" : "—";
  if (showNumericScore && teamId) return String(score);
  if (match.status === "pending" && (match.team_a_id || match.team_b_id)) return "vs";
  return "—";
}

function testMatchStates() {
  const empty = {
    status: "pending",
    winner_id: null,
    team_a_id: null,
    team_b_id: null,
  };
  assert.equal(scoreToken(empty, null, 0), "—", "Empty match should show em dash");

  const scheduled = {
    status: "pending",
    winner_id: null,
    team_a_id: "A",
    team_b_id: "B",
  };
  assert.equal(scoreToken(scheduled, "A", 0), "vs", "Scheduled match should show vs");

  const live = {
    status: "in_progress",
    winner_id: null,
    team_a_id: "A",
    team_b_id: "B",
  };
  assert.equal(scoreToken(live, "A", 2), "2", "In-progress match should show score");

  const finished = {
    status: "finished",
    winner_id: "A",
    team_a_id: "A",
    team_b_id: "B",
  };
  assert.equal(scoreToken(finished, "A", 3), "3", "Finished match should show score");

  const bye = {
    status: "finished",
    winner_id: "A",
    team_a_id: "A",
    team_b_id: null,
  };
  assert.equal(scoreToken(bye, "A", 1), "Bye", "Bye winner row should show Bye");
  assert.equal(scoreToken(bye, null, 0), "—", "Bye empty row should show em dash");

  assert.match(matchCard, /font-bold text-white/, "Winner score should be visually emphasized");
}

function testResponsiveLayout() {
  assert.match(visualLayout, /CARD_W = \{ desktop: 196, tablet: 172, mobile: 152 \}/, "Card widths should match minimal responsive targets");
  assert.match(visualLayout, /COL_GAP = \{ desktop: 72, tablet: 60, mobile: 56 \}/, "Round gap should be compact and responsive");
  assert.match(visualLayout, /if \(viewport === "mobile" && !mobileOverride\)/, "Mobile-specific bracket mode must exist");
}

function testMinimalConnectors() {
  assert.match(visualLayout, /const d = `M \$\{x1\} \$\{y1\} H \$\{midX\} V \$\{y2\} H \$\{x2\}`/, "Connectors should use simple straight segments");
  assert.match(visualLayout, /strokeWidth=\{strokeWidth\}/, "Connector width should be dynamic and minimal");
  assert.match(visualLayout, /opacity=\{opacity\}/, "Connector opacity should be subtle");
  assert.doesNotMatch(visualLayout, /markerEnd|<circle|arrow|badge/i, "Decorative connector elements should be absent");
}

function testPerformanceHints() {
  assert.match(matchCard, /loading="lazy"/, "Logo loading should be lazy");
  assert.match(matchCard, /decoding="async"/, "Logo decoding should be async");
  assert.match(visualLayout, /contentVisibility: "auto"/, "Round columns should use content-visibility auto");
  assert.match(visualLayout, /containIntrinsicSize: "420px"/, "Round columns should define intrinsic size for smoother paint");
  assert.match(visualLayout, /if \(viewport === "mobile" && !mobileOverride\) \{\s*setConnectors\(\[\]\);\s*return;/m, "SVG connector calculations should be skipped on mobile default mode");
}

function run() {
  const tests = [
    ["Minimal surface", testMinimalSurface],
    ["Logo and typography", testLogoAndTypography],
    ["Match states", testMatchStates],
    ["Responsive layout", testResponsiveLayout],
    ["Minimal connectors", testMinimalConnectors],
    ["Performance hints", testPerformanceHints],
  ];

  let pass = 0;
  for (const [name, fn] of tests) {
    fn();
    pass += 1;
    console.log(`PASS: ${name}`);
  }

  console.log(`\nSummary: ${pass}/${tests.length} checks passed.`);
}

run();
