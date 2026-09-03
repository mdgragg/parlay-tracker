import React, { useEffect, useState } from "react";
import { sleeperToEspn } from "../lib/sleeperToEspn";
import { fetchWithCache } from "../lib/cache";
import type { StatType } from "../types/index";

interface LegItemProps {
  playerId: string;
  statType: StatType;
  targetValue: number;
  playerName?: string;
  onRemove?: () => void;
  legId?: string;
  onStatusChange?: (legId: string, percentage: number, color: string) => void;
}

interface PlayerStats {
  [key: string]: string | number | undefined;
  rushingYards?: number;
  receivingYards?: number;
  passingYards?: number;
  rushingTouchdowns?: number;
  receivingTouchdowns?: number;
  passingTouchdowns?: number;
  receptions?: number;
  gamesPlayed?: number;
}

interface Scoreboard {
  [team: string]: number;
}

interface NflState {
  season: string;
  week: number;
  type: "pre" | "regular" | "post" | "off";
}

// Typed as Record<StatType, ...> so adding a StatType fails to compile until
// both its label and its ESPN field are filled in here.
const STAT_LABELS: Record<StatType, string> = {
  rushingYards: "Rushing Yards",
  receivingYards: "Receiving Yards",
  passingYards: "Passing Yards",
  rushingTD: "Rushing TDs",
  receivingTD: "Receiving TDs",
  passingTD: "Passing TDs",
  receptions: "Catches",
};

const STAT_FIELDS: Record<StatType, keyof PlayerStats> = {
  rushingYards: "rushingYards",
  receivingYards: "receivingYards",
  passingYards: "passingYards",
  rushingTD: "rushingTouchdowns",
  receivingTD: "receivingTouchdowns",
  passingTD: "passingTouchdowns",
  receptions: "receptions",
};

const LegItem: React.FC<LegItemProps> = ({
  playerId,
  statType,
  targetValue,
  playerName,
  onRemove,
  legId,
  onStatusChange,
}) => {
  const [stats, setStats] = useState<PlayerStats | null>(null);
  const [seasonStarted, setSeasonStarted] = useState(true);
  const [loading, setLoading] = useState(true);
  const [scoreboard, setScoreboard] = useState<Scoreboard>({});
  const [nflState, setNflState] = useState<NflState | null>(null);
  const playerInfo = sleeperToEspn[playerId];

  // Only the regular/post season counts toward pace. During the preseason
  // Sleeper still reports a week number (e.g. preseason week 3), which would
  // otherwise be read as regular-season week 3.
  const completedWeeks =
    nflState && (nflState.type === "regular" || nflState.type === "post")
      ? nflState.week
      : 0;

  // Sleeper is authoritative on whether the season is underway, so pace stays
  // suppressed during the preseason even if the API response is stale or
  // predates the seasonStarted flag. Unknown state fails open to "underway".
  const seasonUnderway =
    !nflState || nflState.type === "regular" || nflState.type === "post";
  const showPace = seasonStarted && seasonUnderway;

  // Which season/week we're in — fetched once on mount.
  useEffect(() => {
    let cancelled = false;
    async function fetchState() {
      try {
        const res = await fetchWithCache(
          "nfl-state",
          async () => {
            const r = await fetch("https://api.sleeper.app/v1/state/nfl");
            return r.json();
          },
          1000 * 60 * 10 // 10 min TTL
        );
        if (cancelled) return;
        setNflState({
          season: String(res.season ?? ""),
          week: Number(res.display_week || res.week || 0),
          type: res.season_type ?? "regular",
        });
      } catch (err) {
        console.error(err);
      }
    }
    fetchState();
    return () => {
      cancelled = true;
    };
  }, []);

  // Games played, derived from every completed week so far.
  useEffect(() => {
    let cancelled = false;
    async function fetchScoreboard() {
      if (completedWeeks < 1) {
        setScoreboard({});
        return;
      }
      try {
        const res = await fetchWithCache(
          `scoreboard-week-${completedWeeks}`,
          async () => {
            const r = await fetch(
              `https://parlay-tracker.onrender.com/api/espn/scores/${completedWeeks}`
            );
            return r.json();
          },
          1000 * 60 * 5 // 5 min TTL
        );
        if (!cancelled) setScoreboard(res || {});
      } catch (err) {
        console.error(err);
      }
    }
    fetchScoreboard();
    return () => {
      cancelled = true;
    };
  }, [completedWeeks]);

  // Fetch player stats lazily, only when component mounts
  useEffect(() => {
    let cancelled = false;
    async function fetchPlayerStats() {
      if (!playerInfo) {
        setStats(null);
        setLoading(false);
        return;
      }
      try {
        // Read the result rather than setting state inside the fetcher — on a
        // cache hit the fetcher never runs.
        const data = await fetchWithCache(
          `espn-player-${playerId}`,
          async () => {
            const res = await fetch(
              `https://parlay-tracker.onrender.com/api/espn/player/${playerInfo.espnId}`
            );
            if (!res.ok) throw new Error(`Stats request failed: ${res.status}`);
            return res.json();
          }
        );
        if (cancelled) return;
        setStats(data.stats ?? {});
        setSeasonStarted(data.seasonStarted !== false);
      } catch (err) {
        if (cancelled) return;
        console.error(err);
        setStats(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchPlayerStats();
    return () => {
      cancelled = true;
    };
  }, [playerId, playerInfo]);

  if (loading)
    return (
      <div className="leg-container">
        <span className="leg-status-message">Loading stats...</span>
        {onRemove && (
          <span onClick={onRemove} className="remove-btn">
            -
          </span>
        )}
      </div>
    );
  if (!playerInfo || !stats)
    return (
      <div className="leg-container">
        <span className="leg-status-message">Stats unavailable</span>
        {onRemove && (
          <span onClick={onRemove} className="remove-btn">
            -
          </span>
        )}
      </div>
    );

  // Current total for the stat type
  const currentTotal = Number(stats[STAT_FIELDS[statType]] ?? 0);

  const gamesPlayed = scoreboard[playerInfo.team] ?? 0;
  // With zero games there is nothing to extrapolate from — dividing by a
  // floor of 1 would report a full season's worth of stats as a per-game rate.
  const perGame = gamesPlayed > 0 ? currentTotal / gamesPlayed : 0;
  const projected = perGame * 17;
  const remaining = Math.max(targetValue - currentTotal, 0);
  const gamesLeft = Math.max(17 - gamesPlayed, 0);
  const perGameNeeded = gamesLeft > 0 ? remaining / gamesLeft : remaining;

  const percentCurrent = Math.min(100, (currentTotal / targetValue) * 100);
  const percentOfTarget = Math.min(100, (projected / targetValue) * 100);
  const barColor =
    percentOfTarget >= 100
      ? "#3be489"
      : percentOfTarget >= 90
      ? "#eab308"
      : "#dc2626";

  useEffect(() => {
    if (legId && onStatusChange && showPace) {
      onStatusChange(legId, percentOfTarget, barColor);
    }
  }, [legId, onStatusChange, showPace, percentOfTarget, barColor]);

  return (
    <div className="leg-container">
      <h4 style={{ fontWeight: 600 }}>{playerName ?? playerId}</h4>
      <span className="stats">
        <b>
          {targetValue} {STAT_LABELS[statType]}
        </b>{" "}
        {showPace ? (
          <>
            | Current: {currentTotal} | Games Played: {gamesPlayed} | Current
            Per Game: {gamesPlayed > 0 ? perGame.toFixed(1) : "0.0"} |
            Projected: {projected.toFixed(0)} | Needs: {remaining.toFixed(0)} |
            Needs Per Game: {perGameNeeded.toFixed(1)}{" "}
          </>
        ) : (
          <>
            | Current: 0 | {nflState?.season ?? ""} season hasn&apos;t started
            yet
          </>
        )}
      </span>
      <div className="progress-bar">
        <div
          style={{
            height: "100%",
            width: `${showPace ? percentCurrent : 0}%`,
            background: barColor,
            transition: "width 0.5s ease",
          }}
        />
      </div>
      {onRemove && (
        <span onClick={onRemove} className="remove-btn">
          -
        </span>
      )}
    </div>
  );
};

export default LegItem;
