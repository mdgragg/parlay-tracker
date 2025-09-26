import express from "express";
import fetch from "node-fetch";
import cors from "cors";

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// --- In-memory cache ---
interface CacheItem {
  data: any;
  expiry: number;
}
const cache: Record<string, CacheItem> = {};

async function fetchWithCache(url: string, ttlMs = 60_000) {
  const cached = cache[url];
  if (cached && cached.expiry > Date.now()) {
    return cached.data;
  }
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Fetch error ${response.status}`);
  const data = await response.json();
  cache[url] = { data, expiry: Date.now() + ttlMs };
  return data;
}

// --- Interfaces ---
interface EspnStatsResponse {
  splitCategories?: Array<{
    name: string;
    displayName: string;
    splits?: Array<{
      displayName: string;
      stats: Array<string | number>;
    }>;
  }>;
  names: string[];
}

interface EspnScoreboardResponse {
  events: Array<{
    competitions: Array<{
      competitors: Array<{
        team: { abbreviation: string };
      }>;
    }>;
    status: { type: { name: string } };
  }>;
}

// --- Routes ---
app.get("/", (req, res) => {
  res.send("Backend is running");
});

// --- ESPN Player Stats ---
app.get("/api/espn/player/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const url = `https://site.web.api.espn.com/apis/common/v3/sports/football/nfl/athletes/${id}/splits`;
    const data: EspnStatsResponse = await fetchWithCache(url, 5 * 60_000); // cache 5 min

    const splitCategory = data.splitCategories?.find((c) => c.name === "split");
    const allSplits = splitCategory?.splits?.find(
      (s) => s.displayName === "All Splits"
    );

    if (!allSplits)
      return res.status(404).json({ error: "No 'All Splits' stats found" });

    const stats: Record<string, string | number> = {};
    data.names.forEach((name, i) => {
      stats[name] = allSplits.stats[i];
    });

    res.json({ playerId: id, stats });
  } catch (err) {
    console.error("Error fetching ESPN stats:", err);
    res.status(500).json({ error: "Failed to fetch ESPN stats" });
  }
});

// --- All NFL players from Sleeper ---
app.get("/api/v1/players/nfl", async (_req, res) => {
  try {
    const url = "https://api.sleeper.app/v1/players/nfl";
    const data = await fetchWithCache(url, 60 * 60_000); // cache 1 hour
    res.json(data);
  } catch (err) {
    console.error("Failed to fetch players from Sleeper", err);
    res.status(500).json({ error: "Failed to fetch players" });
  }
});

// --- ESPN Scores by week (parallelized) ---
app.get("/api/espn/scores/:week", async (req, res) => {
  const { week } = req.params;
  const maxWeek = Number(week);
  const gamesPlayed: Record<string, number> = {};

  try {
    const urls = Array.from(
      { length: maxWeek },
      (_, i) =>
        `https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?week=${
          i + 1
        }`
    );

    // fetch all weeks in parallel
    const jsons: EspnScoreboardResponse[] = await Promise.all(
      urls.map((url) => fetchWithCache(url, 5 * 60_000)) // cache 5 min
    );

    jsons.forEach((data) => {
      data.events.forEach((game: any) => {
        const home = game.competitions[0].competitors[0].team.abbreviation;
        const away = game.competitions[0].competitors[1].team.abbreviation;
        const status = game.status.type.name;
        if (status === "STATUS_FINAL") {
          gamesPlayed[home] = (gamesPlayed[home] || 0) + 1;
          gamesPlayed[away] = (gamesPlayed[away] || 0) + 1;
        }
      });
    });

    res.json(gamesPlayed);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch scores" });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
