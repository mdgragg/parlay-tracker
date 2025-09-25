export interface Player {
  id: string; // Sleeper player_id (string)
  full_name: string;
  position?: string; // RB, WR, TE, QB...
  team?: string;
  espn_id?: string; // sometimes present in Sleeper players
}

export type StatType =
  | "rushingYards"
  | "receivingYards"
  | "passingYards"
  | "rushingTD"
  | "receivingTD";

export interface Leg {
  id: string;
  playerId: string;
  playerName: string;
  headshotUrl?: string;
  statType: StatType;
  target: number;
  parlayId: string; // ties leg to a parlay/group
  order?: number;
  targetValue: number;
}

export interface Parlay {
  id: string;
  name: string;
  order?: number;
  legs: Leg[];
}

export interface SeasonTotals {
  rush_yd?: number;
  rec_yd?: number;
  rush_td?: number;
  rec_td?: number;
  games_played?: number; // derived
  weeks_seen?: number; // derived
}

export interface OnPaceResult {
  current: number;
  gamesPlayed: number;
  projected: number;
  totalGames: number;
  percentage: number; // 0..1 of target
  status: "on" | "close" | "off";
}

export interface ParlayGroup {
  id: string;
  name: string;
  legs: Leg[];
}
