import express from "express";
import fetch from "node-fetch";
import cors from "cors";
import { sleeperToEspn } from "./sleeperToEspn.js";

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

app.get("/api/espn/player/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const url = `https://site.web.api.espn.com/apis/common/v3/sports/football/nfl/athletes/${id}/splits`;
    const data: EspnStatsResponse = await fetchWithCache(url, 5 * 60_000);

    const splitCategory = data.splitCategories?.find((c) => c.name === "split");
    const allSplits = splitCategory?.splits?.find(
      (s) => s.displayName === "All Splits"
    );

    if (!allSplits)
      return res.status(404).json({ error: "No 'All Splits' stats found" });

    // const stats: Record<string, string | number> = {};
    //     data.names.forEach((name, i) => {
    //       stats[name] = allSplits.stats[i];
    //     });

    const rawStats: Record<string, string | number> = {};
    data.names.forEach((name, i) => {
      rawStats[name] = allSplits.stats[i];
    });

    // Map ESPN keys → clean keys your frontend expects
    // const stats = {
    //   passingYards: rawStats.athPassingYards ?? 0,
    //   passingTouchdowns: rawStats.athPassingTouchdowns ?? 0,
    //   rushingYards: rawStats.rusYds ?? 0,
    //   rushingTouchdowns: rawStats.rusTD ?? 0,
    //   receivingYards: rawStats.recYds ?? 0,
    //   receivingTouchdowns: rawStats.recTD ?? 0,
    // };
    return res.json({
      DEBUG_rawKeys: Object.keys(rawStats),
      DEBUG_sampleValues: rawStats,
    });
  } catch (err) {
    console.error("Error fetching ESPN stats:", err);
    return res.status(500).json({ error: "Failed to fetch ESPN stats" });
  }
});
//     res.json({ playerId: id, stats });
//   } catch (err) {
//     console.error("Error fetching ESPN stats:", err);
//     res.status(500).json({ error: "Failed to fetch ESPN stats" });
//   }
// });

app.get("/api/v1/players/nfl", async (_req, res) => {
  try {
    const url = "https://api.sleeper.app/v1/players/nfl";
    const data = await fetchWithCache(url, 60 * 60_000);
    res.json(data);
  } catch (err) {
    console.error("Failed to fetch players from Sleeper", err);
    res.status(500).json({ error: "Failed to fetch players" });
  }
});

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

    const jsons: EspnScoreboardResponse[] = await Promise.all(
      urls.map((url) => fetchWithCache(url, 5 * 60_000))
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

// --- Pre-warm logic ---
const PREWARM_IDS = Object.values(sleeperToEspn).map((p) => p.espnId);

// helper: chunk into groups of 25 to avoid hammering ESPN
function chunk<T>(arr: T[], size: number): T[][] {
  return arr.reduce(
    (acc, _, i) => (i % size ? acc : [...acc, arr.slice(i, i + size)]),
    [] as T[][]
  );
}

async function prewarm() {
  console.log("Pre-warming cache for players...");
  const playerChunks = chunk(PREWARM_IDS, 25);

  try {
    for (const group of playerChunks) {
      await Promise.all(
        group.map(async (id) => {
          const url = `https://site.web.api.espn.com/apis/common/v3/sports/football/nfl/athletes/${id}/splits`;
          await fetchWithCache(url, 30 * 60_000); // bump TTL to 30 minutes
        })
      );
      await new Promise((r) => setTimeout(r, 2000)); // pause a bit between chunks
    }
    console.log("Pre-warm complete");
  } catch (err) {
    console.error("Pre-warm error:", err);
  }
}

// Run on boot
prewarm();

// Run every 10 minutes
setInterval(prewarm, 10 * 60_000);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
