import React, { useEffect, useState } from "react";
import { sleeperToEspn } from "../lib/sleeperToEspn";

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

  // Fetch current NFL state from Sleeper
  useEffect(() => {
    async function fetchWeek() {
      try {
        const res = await fetch("https://api.sleeper.app/v1/state/nfl");
        if (!res.ok) throw new Error("Failed to fetch NFL state");
        const data: SleeperState = await res.json();
        console.log("Sleeper NFL state:", data);
        setCurrentWeek(data.display_week || data.week || 1);
        console.log("Sleeper NFL state:", data);
      } catch (err) {
        console.error("Failed to fetch week from Sleeper", err);
        setCurrentWeek(1); // fallback
      }
    }
    fetchWeek();
  }, []);

  // Fetch player stats (still using ESPN mapping)
  useEffect(() => {
    async function fetchStats() {
      try {
        const espnId = sleeperToEspn[playerId];
        if (!espnId) throw new Error(`No ESPN mapping for player ${playerId}`);

        const res = await fetch(`/api/espn/player/${espnId}`);
        if (!res.ok) throw new Error("API error");

        const data = await res.json();
        console.log("Fetched stats for", playerName ?? playerId, data.stats);
        setStats(data.stats);
      } catch (err) {
        console.error(err);
        setStats(null);
      } finally {
        setLoading(false);
      }
    }

    fetchStats();

    const handler = () => fetchStats();
    window.addEventListener("refreshLegs", handler);
    return () => window.removeEventListener("refreshLegs", handler);
  }, [playerId, playerName]);

  if (loading) return <div>Loading stats...</div>;
  if (!stats) return <div>Stats unavailable</div>;

  const current = (() => {
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

  const perWeek = current / Math.max(currentWeek, 1);
  const projected = perWeek * 17;
  const percentCurrent = Math.min(100, (current / targetValue) * 100);

  const percentOfTarget = Math.min(100, (projected / targetValue) * 100);

  const barColor =
    percentOfTarget >= 100
      ? "#16a34a"
      : percentOfTarget >= 90
      ? "#eab308"
      : "#dc2626";

  console.log({
    player: playerName ?? playerId,
    current,
    currentWeek,
    perWeek,
    projected,
    percentCurrent,
    percentOfTarget,
  });

  console.log({
    player: playerName ?? playerId,
    current,
    currentWeek,
    perWeek,
    projected,
    percentOfTarget,
  });

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
      <p style={{ fontSize: 12 }}>Current: {current}</p>
      <p style={{ fontSize: 12 }}>
        Projected (17 games): {projected.toFixed(1)}
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
            width: `${percentCurrent}%`, // ✅ actual current progress
            background: barColor, // ✅ pace-based color
            transition: "width 0.5s ease",
          }}
        />
      </div>
    </div>
  );
};

export default LegItem;
