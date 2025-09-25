import { useEffect, useState } from "react";
import type { Parlay } from "../types";
import ParlayList from "./ParlayList";
import {
  loadParlays,
  addParlay,
  replaceParlay,
  updateParlay,
  deleteParlay,
} from "../lib/parlays";

export default function ParlayManager() {
  const [parlays, setParlays] = useState<Record<string, Parlay>>({});
  const [activeParlayId, setActiveParlayId] = useState<string | null>(null);

  useEffect(() => {
    async function fetch() {
      const data = await loadParlays(); // data: Record<string, Parlay>

      // Restore order from localStorage for parlays
      const savedOrder = localStorage.getItem("parlayOrder");
      let orderedParlays: Record<string, Parlay> = {};

      if (savedOrder) {
        const order = JSON.parse(savedOrder) as string[];
        order.forEach((id) => {
          if (data[id]) orderedParlays[id] = data[id];
        });
      }

      // Add any new parlays not in saved order
      Object.values(data).forEach((p) => {
        if (!orderedParlays[p.id]) orderedParlays[p.id] = p;
      });

      setParlays(orderedParlays);
    }

    fetch();
  }, []);

  const handleAddParlay = async () => {
    const newParlay = await addParlay(
      `Parlay ${Object.keys(parlays).length + 1}`,
      Object.keys(parlays).length
    );
    setParlays((prev) => ({ ...prev, [newParlay.id]: newParlay }));
    setActiveParlayId(newParlay.id);
  };

  const handleUpdateParlay = async (parlay: Parlay) => {
    const oldParlay = parlays[parlay.id];
    if (oldParlay && oldParlay.name !== parlay.name) {
      const newParlay = await replaceParlay(oldParlay, parlay.name);
      setParlays((prev) => {
        const copy = { ...prev };
        delete copy[oldParlay.id];
        copy[newParlay.id] = newParlay;
        return copy;
      });
      setActiveParlayId(newParlay.id);
    } else {
      setParlays((prev) => ({ ...prev, [parlay.id]: parlay }));
    }
  };

  const handleDeleteParlay = async (id: string) => {
    await deleteParlay(id);
    setParlays((prev) => {
      const copy = { ...prev };
      delete copy[id];
      return copy;
    });
    if (activeParlayId === id) setActiveParlayId(null);
  };

  const sortedParlays = Object.values(parlays).sort(
    (a, b) => (a.order ?? 0) - (b.order ?? 0)
  );

  return (
    <div className="space-y-6">
      <ParlayList
        parlays={sortedParlays}
        activeParlayId={activeParlayId}
        setActiveParlayId={setActiveParlayId}
        onDelete={handleDeleteParlay}
        onUpdateParlay={handleUpdateParlay}
      />
      <button
        onClick={handleAddParlay}
        className="px-3 py-1 bg-green-500 text-white rounded"
      >
        Add Parlay
      </button>
    </div>
  );
}
