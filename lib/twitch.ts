
export async function getTwitchToken() {
  const clientId = process.env.TWITCH_CLIENT_ID;
  const clientSecret = process.env.TWITCH_CLIENT_SECRET;

  if (!clientId || !clientSecret) return null;

  try {
    const response = await fetch("https://id.twitch.tv/oauth2/token?client_id=" + clientId + "&client_secret=" + clientSecret + "&grant_type=client_credentials", {
      method: "POST",
      cache: "no-store"
    });

    if (!response.ok) return null;
    const data = await response.json();
    return data.access_token;
  } catch (error) {
    console.error("Error fetching twitch token", error);
    return null;
  }
}

export async function getTwitchStreams(usernames: string[]) {
  if (usernames.length === 0) return [];
  
  const clientId = process.env.TWITCH_CLIENT_ID;
  const token = await getTwitchToken();

  if (!clientId || !token) return [];

  try {
    const queryParams = usernames.map((u) => "user_login=" + encodeURIComponent(u)).join("&");
    const response = await fetch("https://api.twitch.tv/helix/streams?" + queryParams, {
      headers: {
        "Client-ID": clientId,
        "Authorization": "Bearer " + token,
      },
      next: { revalidate: 60 } // Polling a cada 60 segundos
    });

    if (!response.ok) return [];
    const data = await response.json();
    return data.data;
  } catch (error) {
    console.error("Error fetching twitch streams", error);
    return [];
  }
}

export async function getTwitchUsers(usernames: string[]) {
  if (usernames.length === 0) return [];

  const clientId = process.env.TWITCH_CLIENT_ID;
  const token = await getTwitchToken();

  if (!clientId || !token) return [];

  try {
    const queryParams = usernames.map((u) => "login=" + encodeURIComponent(u)).join("&");
    const response = await fetch("https://api.twitch.tv/helix/users?" + queryParams, {
      headers: {
        "Client-ID": clientId,
        "Authorization": "Bearer " + token,
      },
      next: { revalidate: 3600 } 
    });

    if (!response.ok) return [];
    const data = await response.json();
    return data.data;
  } catch (error) {
    console.error("Error fetching twitch users", error);
    return [];
  }
}
