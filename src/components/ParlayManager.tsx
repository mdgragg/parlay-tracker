import { useState } from "react";
import { useParlayStore } from "../store/parlays";
import type { Parlay } from "../types";
import ParlayList from "./ParlayList";

export default function ParlayManager() {
  const parlays = Object.values(useParlayStore((s) => s.parlays));
  const addParlay = useParlayStore((s) => s.addParlay);
  const removeParlay = useParlayStore((s) => s.removeParlay);

  const [activeParlayId, setActiveParlayId] = useState<string | null>(null);

  const handleDeleteParlay = (parlayId: string) => {
    removeParlay(parlayId);
    if (activeParlayId === parlayId) setActiveParlayId(null);
  };

  // 👇 always sort by order before rendering
  const sortedParlays: Parlay[] = [...parlays].sort(
    (a, b) => (a.order ?? 0) - (b.order ?? 0)
  );

  return (
    <div className="space-y-6">
      <ParlayList
        parlays={sortedParlays}
        activeParlayId={activeParlayId}
        setActiveParlayId={setActiveParlayId}
        onDelete={handleDeleteParlay}
      />

      <div className="flex gap-3 mb-4">
        <button
          onClick={() => {
            const newId = addParlay(`Parlay ${sortedParlays.length + 1}`);
            setActiveParlayId(newId);
          }}
          className="px-3 py-1 bg-green-500 text-white rounded"
        >
          Add Parlay
        </button>
      </div>
    </div>
  );
}
