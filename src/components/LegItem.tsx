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

interface SleeperState {
  week: number;
  display_week: number;
  season_type: string;
  [key: string]: any;
}

const LegItem: React.FC<LegItemProps> = ({
  playerId,
  statType,
  targetValue,
  playerName,
}) => {
  const [stats, setStats] = useState<PlayerStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentWeek, setCurrentWeek] = useState<number>(1);

  // Fetch current week from Sleeper API
  useEffect(() => {
    async function fetchWeek() {
      try {
        const res = await fetch("https://api.sleeper.app/v1/state/nfl");
        if (!res.ok) throw new Error("Failed to fetch NFL state");
        const data: SleeperState = await res.json();

        // Use display_week if available
        setCurrentWeek(data.display_week || data.week || 1);
      } catch (err) {
        console.error("Failed to fetch week from Sleeper", err);
        setCurrentWeek(1);
      }
    }
    fetchWeek();
  }, []);

  // Fetch player stats from ESPN API (with caching)
  useEffect(() => {
    async function fetchStats() {
      const key = `espn-player-${playerId}`;

      await fetchWithCache(key, async () => {
        try {
          const espnId = sleeperToEspn[playerId];
          if (!espnId)
            throw new Error(`No ESPN mapping for player ${playerId}`);

          const res = await fetch(
            `https://parlay-tracker.onrender.com/api/espn/player/${espnId}`
          );
          if (!res.ok) throw new Error("API error");

          const data = await res.json();
          setStats(data.stats);
          return data.stats;
        } catch (err) {
          console.error(err);
          setStats(null);
          return null;
        } finally {
          setLoading(false);
        }
      });
    }

    fetchStats();

    const handler = () => fetchStats();
    window.addEventListener("refreshLegs", handler);
    return () => window.removeEventListener("refreshLegs", handler);
  }, [playerId, playerName]);

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

  // Determine games played
  let gamesPlayed = currentWeek;
  if (currentTotal === 0) gamesPlayed = 0;
  if (currentTotal > 0) {
    const perGameGuess = currentTotal / currentWeek;
    if (perGameGuess < (targetValue / 17) * 0.5) {
      gamesPlayed = currentWeek - 1;
    }
  }

  const perWeek = currentTotal / Math.max(gamesPlayed, 1);
  const projected = perWeek * 17;

  // NEW: remaining to target & per-game needed
  const remaining = Math.max(targetValue - currentTotal, 0);
  const gamesLeft = Math.max(17 - currentWeek, 0);
  const perGameNeeded = gamesLeft > 0 ? remaining / gamesLeft : remaining;

  const percentCurrent = Math.min(100, (currentTotal / targetValue) * 100);
  const percentOfTarget = Math.min(100, (projected / targetValue) * 100);

  const barColor =
    percentOfTarget >= 100
      ? "#16a34a"
      : percentOfTarget >= 90
      ? "#eab308"
      : "#dc2626";

  return (
    <div
      style={{
        border: "1px solid #ddd",
        borderRadius: 8,
        padding: 12,
        marginBottom: 8,
        background: "#fff",
      }}
    >
      <h4 style={{ fontWeight: 600 }}>{playerName ?? playerId}</h4>
      <p style={{ fontSize: 12, color: "#555" }}>
        Target: {targetValue} {statType === "rushingYards" && "Rushing Yards"}
        {statType === "receivingYards" && "Receiving Yards"}
        {statType === "passingYards" && "Passing Yards"}
        {statType === "rushingTD" && "Rushing TDs"}
        {statType === "receivingTD" && "Receiving TDs"}
      </p>
      <p style={{ fontSize: 12 }}>Current: {currentTotal}</p>
      <p style={{ fontSize: 12 }}>
        Projected (17 games): {projected.toFixed(1)}
      </p>
      <p style={{ fontSize: 12 }}>
        Remaining to target: {remaining.toFixed(1)}
      </p>
      <p style={{ fontSize: 12 }}>
        Needed per remaining game: {perGameNeeded.toFixed(1)}
      </p>

      <div
        style={{
          width: "100%",
          height: 16,
          background: "#e5e7eb",
          borderRadius: 8,
          overflow: "hidden",
          marginTop: 4,
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${percentCurrent}%`,
            background: barColor,
            transition: "width 0.5s ease",
          }}
        />
      </div>
    </div>
  );
};

export default LegItem;
