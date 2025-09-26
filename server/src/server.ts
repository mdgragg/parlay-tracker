import express from "express";
import fetch from "node-fetch";
import cors from "cors";

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());

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

app.use(express.json());

app.get("/", (req, res) => {
  res.send("Backend is running");
});

app.get("/api/espn/player/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const url = `https://site.web.api.espn.com/apis/common/v3/sports/football/nfl/athletes/${id}/splits`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`ESPN API error: ${response.status}`);
    }

    const data = (await response.json()) as EspnStatsResponse;

    // Use splitCategories instead of categories
    const splitCategory = data.splitCategories?.find((c) => c.name === "split");
    const allSplits = splitCategory?.splits?.find(
      (s) => s.displayName === "All Splits"
    );

    if (!allSplits) {
      return res.status(404).json({ error: "No 'All Splits' stats found" });
    }

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

app.get("/api/v1/players/nfl", async (req, res) => {
  try {
    const data = await fetch("https://api.sleeper.app/v1/players/nfl").then(
      (r) => r.json()
    );
    res.json(data);
  } catch (err) {
    console.error("Failed to fetch players from Sleeper", err);
    res.status(500).json({ error: "Failed to fetch players" });
  }
});

app.get("/api/espn/scores/:week", async (req, res) => {
  const { week } = req.params;
  try {
    const url = `https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?week=${week}`;
    const response = await fetch(url);
    if (!response.ok)
      throw new Error(`ESPN scoreboard error: ${response.status}`);
    const data = (await response.json()) as EspnScoreboardResponse;

    // Build a map: team -> games played
    const gamesPlayed: Record<string, number> = {};
    data.events.forEach((game: any) => {
      const home = game.competitions[0].competitors[0].team.abbreviation;
      const away = game.competitions[0].competitors[1].team.abbreviation;
      const status = game.status.type.name; // "STATUS_SCHEDULED", "STATUS_FINAL"
      if (status === "STATUS_FINAL") {
        gamesPlayed[home] = (gamesPlayed[home] || 0) + 1;
        gamesPlayed[away] = (gamesPlayed[away] || 0) + 1;
      }
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
