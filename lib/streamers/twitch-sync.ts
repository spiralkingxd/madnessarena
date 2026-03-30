import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

type TwitchStream = {
  user_id: string;
  user_login: string;
  title: string;
  game_name: string;
  viewer_count: number;
  started_at: string;
};

type TwitchSearchChannel = {
  id: string;
  broadcaster_login: string;
  display_name: string;
  title: string;
  game_name: string;
  is_live: boolean;
  thumbnail_url: string;
  started_at?: string;
};

let cachedToken: { value: string; expiresAt: number } | null = null;

async function getTwitchAppToken() {
  const clientId = process.env.TWITCH_CLIENT_ID?.trim();
  const clientSecret = process.env.TWITCH_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) return null;

  const now = Date.now();
  if (cachedToken && cachedToken.expiresAt > now + 60_000) {
    return cachedToken.value;
  }

  const response = await fetch("https://id.twitch.tv/oauth2/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "client_credentials",
    }),
    cache: "no-store",
  });

  if (!response.ok) return null;
  const data = (await response.json()) as { access_token: string; expires_in: number };
  cachedToken = {
    value: data.access_token,
    expiresAt: now + Math.max(60, data.expires_in - 120) * 1000,
  };
  return data.access_token;
}

function chunk<T>(rows: T[], size: number) {
  const result: T[][] = [];
  for (let i = 0; i < rows.length; i += size) {
    result.push(rows.slice(i, i + size));
  }
  return result;
}

async function fetchTwitchStreams(logins: string[]) {
  const clientId = process.env.TWITCH_CLIENT_ID?.trim();
  const token = await getTwitchAppToken();
  if (!clientId || !token || logins.length === 0) return [];

  const all: TwitchStream[] = [];
  for (const part of chunk(logins, 100)) {
    const params = new URLSearchParams();
    for (const login of part) {
      params.append("user_login", login);
    }
    const response = await fetch(`https://api.twitch.tv/helix/streams?${params.toString()}`, {
      headers: {
        "Client-ID": clientId,
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    });
    if (!response.ok) continue;
    const payload = (await response.json()) as { data: TwitchStream[] };
    all.push(...(payload.data ?? []));
  }
  return all;
}

async function fetchTwitchSearchChannels(query: string) {
  const clientId = process.env.TWITCH_CLIENT_ID?.trim();
  const token = await getTwitchAppToken();
  if (!clientId || !token) return [];

  let cursor: string | null = null;
  const rows: TwitchSearchChannel[] = [];

  for (let page = 0; page < 5; page += 1) {
    const params = new URLSearchParams({
      query,
      first: "100",
      live_only: "true",
    });
    if (cursor) params.set("after", cursor);

    const response = await fetch(`https://api.twitch.tv/helix/search/channels?${params.toString()}`, {
      headers: {
        "Client-ID": clientId,
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    });

    if (!response.ok) break;
    const payload = (await response.json()) as {
      data?: TwitchSearchChannel[];
      pagination?: { cursor?: string };
    };
    rows.push(...(payload.data ?? []));
    cursor = payload.pagination?.cursor ?? null;
    if (!cursor) break;
  }

  return rows;
}

async function ensureMadnessArenaTagId() {
  const supabase = createAdminClient();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("streamer_tags")
    .upsert({ slug: "madnessarena", name: "MadnessArena", is_highlight: true }, { onConflict: "slug" })
    .select("id")
    .single();

  if (error || !data) return null;
  return String(data.id);
}

export async function discoverMadnessArenaStreamers() {
  const supabase = createAdminClient();
  if (!supabase) {
    return { ok: false, message: "SUPABASE_SERVICE_ROLE_KEY missing" };
  }

  const channels = await fetchTwitchSearchChannels("madnessarena");
  if (channels.length === 0) {
    return { ok: true, discovered: 0, upserted: 0 };
  }

  const tagId = await ensureMadnessArenaTagId();
  if (!tagId) {
    return { ok: false, message: "Unable to resolve madnessarena tag id" };
  }

  const nowIso = new Date().toISOString();
  let upserted = 0;

  for (const channel of channels) {
    const username = String(channel.broadcaster_login ?? "").trim().toLowerCase();
    const twitchId = String(channel.id ?? "").trim();
    if (!username || !twitchId) continue;

    const payload = {
      username,
      display_name: channel.display_name || username,
      platform: "twitch",
      channel_url: `https://twitch.tv/${username}`,
      twitch_id: twitchId,
      twitch_login: username,
      community_enabled: true,
      is_live: Boolean(channel.is_live),
      live_title: channel.is_live ? channel.title || null : null,
      live_game: channel.is_live ? channel.game_name || null : null,
      live_started_at: channel.is_live ? channel.started_at ?? null : null,
      last_checked_at: nowIso,
      last_seen_online: channel.is_live ? nowIso : null,
    };

    const { data } = await supabase
      .from("streamers")
      .upsert(payload, { onConflict: "twitch_id", ignoreDuplicates: false })
      .select("id")
      .single();

    if (!data?.id) continue;
    upserted += 1;

    await supabase
      .from("streamer_tag_links")
      .upsert({ streamer_id: String(data.id), tag_id: tagId }, { onConflict: "streamer_id,tag_id", ignoreDuplicates: false });
  }

  return { ok: true, discovered: channels.length, upserted };
}

export async function syncTwitchStreamersStatus() {
  const supabase = createAdminClient();
  if (!supabase) {
    return { ok: false, message: "SUPABASE_SERVICE_ROLE_KEY missing" };
  }

  const { data: rows, error } = await supabase
    .from("streamers")
    .select("id, username, twitch_login")
    .eq("community_enabled", true)
    .eq("platform", "twitch");

  if (error) {
    return { ok: false, message: error.message };
  }

  const streamers = (rows ?? []).map((row) => ({
    id: String(row.id),
    login: String(row.twitch_login ?? row.username ?? "").trim().toLowerCase(),
  })).filter((row) => row.login.length > 0);

  if (streamers.length === 0) {
    return { ok: true, checked: 0, live: 0 };
  }

  const streams = await fetchTwitchStreams(streamers.map((row) => row.login));
  const byLogin = new Map<string, TwitchStream>();
  for (const stream of streams) {
    byLogin.set(stream.user_login.toLowerCase(), stream);
  }

  const nowIso = new Date().toISOString();
  const updates = streamers.map((streamer) => {
    const stream = byLogin.get(streamer.login);
    if (!stream) {
      return supabase.from("streamers").update({
        is_live: false,
        live_title: null,
        live_game: null,
        viewers: 0,
        live_started_at: null,
        last_checked_at: nowIso,
      }).eq("id", streamer.id);
    }
    return supabase.from("streamers").update({
      is_live: true,
      live_title: stream.title,
      live_game: stream.game_name,
      viewers: stream.viewer_count,
      live_started_at: stream.started_at,
      last_seen_online: nowIso,
      last_checked_at: nowIso,
    }).eq("id", streamer.id);
  });

  await Promise.all(updates);

  return { ok: true, checked: streamers.length, live: streams.length };
}
