import { useEffect, useState } from "react";
import type { Parlay, Leg, StatType } from "../types/index";
import { getAllPlayers, type SleeperPlayer } from "../lib/sleeperPlayers";
import { supabase } from "../lib/supabase";

interface Props {
  parlay: Parlay;
  onLegAdded: (leg: Leg) => void;
}

export default function AddLegForm({ parlay, onLegAdded }: Props) {
  const [players, setPlayers] = useState<SleeperPlayer[]>([]);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<SleeperPlayer | null>(null);
  const [statType, setStatType] = useState<StatType>("rushingYards");
  const [target, setTarget] = useState<number>(0);
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  useEffect(() => {
    getAllPlayers().then(setPlayers);
  }, []);

  const filtered = players
    .filter((p) => p.full_name.toLowerCase().includes(search.toLowerCase()))
    .slice(0, 10);

  useEffect(() => setHighlightedIndex(0), [search]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!filtered.length) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev + 1) % filtered.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex(
        (prev) => (prev - 1 + filtered.length) % filtered.length,
      );
    } else if (e.key === "Enter") {
      e.preventDefault();
      setSelected(filtered[highlightedIndex]);
      setSearch("");
    }
  };

  const handleAdd = async () => {
    if (!selected) return;

    const { data, error } = await supabase
      .from("legs")
      .insert([
        {
          parlay_id: parlay.id,
          player_id: selected.player_id,
          player_name: selected.full_name,
          stat_type: statType,
          target,
          headshot_url: selected.headshot_url || undefined,
          order_index: parlay.legs.length,
        },
      ])
      .select()
      .single();

    if (error) {
      console.error("Failed to insert leg", error);
      return;
    }

    onLegAdded({
      id: data.id,
      parlayId: data.parlay_id,
      playerId: data.player_id,
      playerName: data.player_name,
      statType: data.stat_type,
      target: data.target,
      targetValue: data.target,
      headshotUrl: data.headshot_url,
      order: data.order_index,
    });

    setSelected(null);
    setTarget(0);
    setSearch("");
  };

  return (
    <div className="p-4 border rounded bg-gray-50 space-y-3">
      {/* Search, Dropdown, Target, and Add Button - one line on desktop, 3 rows on mobile */}
      <div className="addleg-row">
        {!selected && (
          <div
            className="player-dropdown player-slot"
            style={{ position: "relative" }}
          >
            <input
              type="search"
              placeholder="Search Player"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={handleKeyDown}
              className="player-dropdown-input"
              style={{ width: "100%", margin: 0, boxSizing: "border-box" }}
            />
            {search.length > 0 && filtered.length > 0 && (
              <div className="player-dropdown-list">
                {filtered.map((p, idx) => (
                  <div
                    key={p.player_id}
                    onClick={() => {
                      setSelected(p);
                      setSearch("");
                    }}
                    className={`player-dropdown-item ${
                      idx === highlightedIndex ? "selected" : ""
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
        )}

        {selected && (
          <div className="player-slot player-slot-box">
            {selected.headshot_url && (
              <img
                src={selected.headshot_url}
                alt={selected.full_name}
                style={{
                  width: "24px",
                  height: "24px",
                  borderRadius: "50%",
                  flexShrink: 0,
                }}
              />
            )}
            <span
              style={{
                fontWeight: 600,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                flex: 1,
              }}
            >
              {selected.full_name}
            </span>
            <button
              type="button"
              onClick={() => setSelected(null)}
              className="btn-change"
              style={{ flexShrink: 0 }}
            >
              ✕
            </button>
          </div>
        )}
        <div className="addleg-target-group">
          <select
            value={statType}
            onChange={(e) => setStatType(e.target.value as StatType)}
            style={{ minWidth: "130px", flex: "0 0 auto" }}
          >
            <option value="rushingYards">Rushing Yards</option>
            <option value="receivingYards">Receiving Yards</option>
            <option value="passingYards">Passing Yards</option>
            <option value="rushingTD">Rushing TDs</option>
            <option value="receivingTD">Receiving TDs</option>
            <option value="passingTD">Passing TDs</option>
            <option value="receptions">Catches</option>
          </select>

          <input
            type="number"
            placeholder="Target"
            value={target}
            onChange={(e) => setTarget(Number(e.target.value))}
            style={{ minWidth: "80px", flex: "0 0 auto" }}
          />

          <button
            type="button"
            onClick={handleAdd}
            className="btn-centered"
            disabled={!selected || !target}
            style={{
              display: "inline-block",
              margin: "0",
              padding: "0.5rem 1rem",
              flex: "0 0 auto",
            }}
          >
            Add
          </button>
        </div>
      </div>
    </div>
  );
}
