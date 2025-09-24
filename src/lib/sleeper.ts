import type { Player } from "../types/index";

const API = "https://parlay-tracker.onrender.com/api/v1"; // via Vite proxy; remove /api if not using proxy

// Get current NFL state (season/week)
export async function getNflState(): Promise<{
  season: number;
  week: number;
  season_type: "pre" | "regular" | "post";
}> {
  const res = await fetch(`${API}/state/nfl`);
  if (!res.ok) throw new Error("Failed to fetch NFL state");
  return res.json();
}

// Cache players in-memory (and in sessionStorage) to avoid 5–10MB refetches
let playersCache: Player[] | null = null;

export async function getAllPlayers(): Promise<Player[]> {
  if (playersCache) return playersCache;

  const cached = sessionStorage.getItem("players_v1");
  if (cached) {
    playersCache = JSON.parse(cached);
    return playersCache!;
  }

  const res = await fetch(`${API}/players/nfl`);
  if (!res.ok) throw new Error("Failed to fetch players");
  const data = (await res.json()) as Record<string, any>;

  const players: Player[] = Object.values(data)
    .map((p: any) => ({
      id: String(p.player_id ?? p.playerId ?? p.id),
      full_name:
        p.full_name ?? `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim(),
      position: p.position,
      team: p.team,
      espn_id: p.espn_id ?? p.metadata?.espn_id,
    }))
    .filter((p) => p.id && p.full_name);

  playersCache = players;
  sessionStorage.setItem("players_v1", JSON.stringify(players));
  return players;
}

// Headshot URL: prefer ESPN if we have espn_id; else fall back to a placeholder
export function getHeadshotUrl(player: Player): string {
  if (player.espn_id) {
    // Known public pattern for ESPN headshots
    return `https://a.espncdn.com/i/headshots/nfl/players/full/${player.espn_id}.png`;
  }
  // fallback to a neutral placeholder in /assets
  return "/assets/placeholder-headshot.svg";
}
