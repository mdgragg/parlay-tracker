import type { SeasonTotals, StatType } from "../types/index";

function getCurrentValue(stats: any, statType: string) {
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
}

function getPacePercentage(current: number, target: number) {
  return Math.min(100, (current / target) * 100);
}

function getPaceColor(current: number, target: number) {
  const pct = current / target;
  if (pct >= 1) return "green";
  if (pct >= 0.75) return "yellow";
  return "red";
}
