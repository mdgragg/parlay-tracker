export interface SleeperPlayer {
  player_id: string;
  full_name: string;
  team: string | null;
  position: string;
  headshot_url?: string;
}

let playersCache: SleeperPlayer[] | null = null;

export async function getAllPlayers(): Promise<SleeperPlayer[]> {
  if (playersCache) return playersCache;

  const res = await fetch("https://api.sleeper.app/v1/players/nfl");
  const data = await res.json();

  playersCache = Object.values(data).map((p: any) => ({
    player_id: p.player_id,
    full_name: p.full_name || p.first_name + " " + p.last_name,
    team: p.team || null,
    position: p.position,
    headshot_url: p.metadata?.headshot || p.headshot_url || null,
  }));

  return playersCache;
}
