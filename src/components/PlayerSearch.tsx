import { useEffect, useMemo, useState } from "react";
import { getAllPlayers, getHeadshotUrl } from "../lib/sleeper";
import type { Player } from "../types/index";

export default function PlayerSearch({
  onSelect,
}: {
  onSelect: (p: Player) => void;
}) {
  const [players, setPlayers] = useState<Player[]>([]);
  const [q, setQ] = useState("");

  useEffect(() => {
    getAllPlayers().then(setPlayers).catch(console.error);
  }, []);

  const results = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return players.slice(0, 50);
    return players
      .filter((p) => {
        return (
          p.full_name.toLowerCase().includes(query) ||
          (p.team ?? "").toLowerCase().includes(query) ||
          (p.position ?? "").toLowerCase().includes(query)
        );
      })
      .slice(0, 50);
  }, [players, q]);

  return (
    <div className="space-y-2">
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search players by name/team/position"
        className="w-full rounded border px-3 py-2"
      />
      <div className="max-h-64 overflow-auto border rounded">
        {results.map((p) => (
          <button
            key={p.id}
            className="w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-50 text-left"
            onClick={() => onSelect(p)}
          >
            <img
              src={getHeadshotUrl(p)}
              onError={(e) => {
                (e.target as HTMLImageElement).src =
                  "/assets/placeholder-headshot.svg";
              }}
              alt=""
              className="h-8 w-8 rounded-full object-cover"
            />
            <div>
              <div className="font-medium">{p.full_name}</div>
              <div className="text-xs text-gray-500">
                {p.team ?? "FA"} · {p.position ?? "-"}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
