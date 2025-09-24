import { useEffect, useState } from "react";
import { useParlayStore } from "../store/parlays";
import type { Parlay, Leg, StatType } from "../types/index";
import { getAllPlayers, type SleeperPlayer } from "../lib/sleeperPlayers";

interface Props {
  parlay: Parlay;
  onAddLeg: (parlayId: string, leg: Leg) => void;
  onCancel?: () => void;
}

export default function AddLegForm({ parlay, onAddLeg }: Props) {
  const addLeg = useParlayStore((s) => s.addLeg);

  const [players, setPlayers] = useState<SleeperPlayer[]>([]);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<SleeperPlayer | null>(null);
  const [statType, setStatType] = useState<StatType>("rushingYards");
  const [target, setTarget] = useState<number>(0);
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  useEffect(() => {
    getAllPlayers().then((list) => setPlayers(list));
  }, []);

  const filtered = players
    .filter((p) => p.full_name.toLowerCase().includes(search.toLowerCase()))
    .slice(0, 10);

  useEffect(() => {
    setHighlightedIndex(0);
  }, [search]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!filtered.length) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev + 1) % filtered.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex(
        (prev) => (prev - 1 + filtered.length) % filtered.length
      );
    } else if (e.key === "Enter") {
      e.preventDefault();
      setSelected(filtered[highlightedIndex]);
      setSearch("");
    }
  };

  const handleAdd = () => {
    if (!selected) return;

    const leg: Omit<Leg, "id" | "order"> = {
      parlayId: parlay.id,
      playerId: selected.player_id,
      statType,
      target,
      playerName: selected.full_name,
      headshotUrl: selected.headshot_url || undefined,
    };

    addLeg(leg as Leg); // store will assign id & order
    setSelected(null);
    setTarget(0);
    setSearch("");
  };

  return (
    <div className="p-4 border rounded bg-gray-50 space-y-3">
      {!selected ? (
        <div className="relative">
          <input
            placeholder="Search Player"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={handleKeyDown}
            className="player-dropdown"
          />

          {search.length > 0 && filtered.length > 0 && (
            <div className="absolute z-10 w-full bg-white border rounded mt-1 max-h-40 overflow-y-auto shadow">
              {filtered.map((p, idx) => (
                <div
                  key={p.player_id}
                  onClick={() => {
                    setSelected(p);
                    setSearch("");
                  }}
                  className={`flex items-center gap-2 p-2 cursor-pointer ${
                    idx === highlightedIndex
                      ? "bg-gray-200"
                      : "hover:bg-gray-100"
                  }`}
                >
                  {p.headshot_url && (
                    <img
                      src={p.headshot_url}
                      alt={p.full_name}
                      className="w-6 h-6 rounded-full"
                    />
                  )}
                  <span>
                    {p.full_name} ({p.position}
                    {p.team ? ` - ${p.team}` : ""})
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="flex items-center gap-2">
          {selected.headshot_url && (
            <img
              src={selected.headshot_url}
              alt={selected.full_name}
              className="w-8 h-8 rounded-full"
            />
          )}
          <span>{selected.full_name}</span>
          <button
            type="button"
            onClick={() => setSelected(null)}
            className="text-xs text-red-500"
          >
            ✕ Change
          </button>
        </div>
      )}

      <div className="flex gap-2 items-center">
        <select
          value={statType}
          onChange={(e) => setStatType(e.target.value as StatType)}
          className="border px-2 py-1 rounded"
        >
          <option value="rushingYards">Rushing Yards</option>
          <option value="receivingYards">Receiving Yards</option>
          <option value="passingYards">Passing Yards</option>
          <option value="rushingTD">Rushing TDs</option>
          <option value="receivingTD">Receiving TDs</option>
        </select>
        <input
          type="number"
          placeholder="Target"
          value={target}
          onChange={(e) => setTarget(Number(e.target.value))}
          className="border px-2 py-1 rounded w-24"
        />
        <button
          type="button"
          onClick={handleAdd}
          className="px-3 py-1 bg-blue-500 text-white rounded"
          disabled={!selected || !target}
        >
          Add
        </button>
      </div>
    </div>
  );
}
