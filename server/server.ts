import express from "express";
import fetch from "node-fetch";

const app = express();
const port = process.env.PORT || 3000;

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

app.use(express.json());

// Example endpoint
app.get("/api/hello", (req, res) => {
  res.json({ message: "Hello from server!" });
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

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
