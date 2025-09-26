import React, { useEffect, useState } from "react";
import { sleeperToEspn } from "../lib/sleeperToEspn";
import { fetchWithCache } from "../lib/cache";

interface LegItemProps {
  playerId: string;
  statType:
    | "rushingYards"
    | "receivingYards"
    | "passingYards"
    | "rushingTD"
    | "receivingTD";
  targetValue: number;
  playerName?: string;
  onRemove?: () => void;
}

interface PlayerStats {
  [key: string]: string | number | undefined;
  rushingYards?: number;
  receivingYards?: number;
  passingYards?: number;
  rushingTouchdowns?: number;
  receivingTouchdowns?: number;
  gamesPlayed?: number;
}

interface Scoreboard {
  [team: string]: number;
}

const LegItem: React.FC<LegItemProps> = ({
  playerId,
  statType,
  targetValue,
  playerName,
  onRemove,
}) => {
  const [stats, setStats] = useState<PlayerStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [scoreboard, setScoreboard] = useState<Scoreboard>({});
  const [currentWeek, setCurrentWeek] = useState<number>(1);
  const playerInfo = sleeperToEspn[playerId];

  // Fetch current week & scoreboard in parallel
  useEffect(() => {
    async function fetchWeekAndScoreboard() {
      try {
        const [stateRes, scoreboardRes] = await Promise.all([
          fetchWithCache(
            "nfl-state",
            async () => {
              const res = await fetch("https://api.sleeper.app/v1/state/nfl");
              return res.json();
            },
            1000 * 60 * 10
          ), // 10 min TTL
          fetchWithCache(
            `scoreboard-week-${currentWeek}`,
            async () => {
              const res = await fetch(
                `https://parlay-tracker.onrender.com/api/espn/scores/${currentWeek}`
              );
              return res.json();
            },
            1000 * 60 * 5
          ), // 5 min TTL
        ]);

        setCurrentWeek(stateRes.display_week || stateRes.week || 1);
        setScoreboard(scoreboardRes || {});
      } catch (err) {
        console.error(err);
      }
    }

    fetchWeekAndScoreboard();
  }, [currentWeek]);

  // Fetch player stats lazily, only when component mounts
  useEffect(() => {
    async function fetchPlayerStats() {
      const key = `espn-player-${playerId}`;
      await fetchWithCache(key, async () => {
        try {
          const res = await fetch(
            `https://parlay-tracker.onrender.com/api/espn/player/${playerInfo.espnId}`
          );
          const data = await res.json();
          setStats(data.stats);
          return data.stats;
        } catch {
          setStats(null);
          return null;
        } finally {
          setLoading(false);
        }
      });
    }

    fetchPlayerStats();
  }, [playerId]);

  if (loading) return <div>Loading stats...</div>;
  if (!stats) return <div>Stats unavailable</div>;

  // Current total for the stat type
  const currentTotal = (() => {
    switch (statType) {
      case "rushingYards":
        return Number(stats.rushingYards ?? 0);
      case "receivingYards":
        return Number(stats.receivingYards ?? 0);
      case "passingYards":
        return Number(stats.passingYards ?? 0);
      case "rushingTD":
        return Number(stats.rushingTouchdowns ?? 0);
      case "receivingTD":
        return Number(stats.receivingTouchdowns ?? 0);
      default:
        return 0;
    }
  })();

  const gamesPlayed = scoreboard[playerInfo.team] ?? 0;
  const perGame = currentTotal / Math.max(gamesPlayed, 1);
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

  return (
    <div className="leg-container">
      <h4 style={{ fontWeight: 600 }}>{playerName ?? playerId}</h4>
      <span className="stats">
        <b>
          {targetValue} {statType === "rushingYards" && "Rushing Yards"}
          {statType === "receivingYards" && "Receiving Yards"}
          {statType === "passingYards" && "Passing Yards"}
          {statType === "rushingTD" && "Rushing TDs"}
          {statType === "receivingTD" && "Receiving TDs"}
        </b>{" "}
        | Current: {currentTotal} | Games Played: {gamesPlayed} | Current Per
        Game: {gamesPlayed > 0 ? perGame.toFixed(1) : "0.0"} | Projected:{" "}
        {projected.toFixed(0)} | Needs: {remaining.toFixed(0)} | Needs Per Game:{" "}
        {perGameNeeded.toFixed(1)}{" "}
      </span>
      <div className="progress-bar">
        <div
          style={{
            height: "100%",
            width: `${percentCurrent}%`,
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
