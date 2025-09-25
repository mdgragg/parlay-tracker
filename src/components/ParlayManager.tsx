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

  // Load all parlays and restore order
  useEffect(() => {
    async function fetch() {
      const data = await loadParlays(); // Record<string, Parlay>

      const savedOrder = localStorage.getItem("parlayOrder");
      const order = savedOrder ? (JSON.parse(savedOrder) as string[]) : [];

      // Build ordered array of parlays
      const ordered: Parlay[] = [];
      order.forEach((id) => {
        if (data[id]) ordered.push(data[id]);
      });

      // Add any missing ones from DB
      Object.values(data).forEach((p) => {
        if (!ordered.find((o) => o.id === p.id)) ordered.push(p);
      });

      // Save back to localStorage to keep in sync
      localStorage.setItem(
        "parlayOrder",
        JSON.stringify(ordered.map((p) => p.id))
      );

      // Convert back to object for state
      const obj: Record<string, Parlay> = {};
      ordered.forEach((p) => (obj[p.id] = p));
      setParlays(obj);
    }

    fetch();
  }, []);

  const handleAddParlay = async () => {
    const newParlay = await addParlay(
      `Parlay ${Object.keys(parlays).length + 1}`,
      Object.keys(parlays).length
    );

    setParlays((prev) => {
      const copy = { ...prev, [newParlay.id]: newParlay };
      const order = Object.values(copy).sort(
        (a, b) => (a.order ?? 0) - (b.order ?? 0)
      );
      localStorage.setItem(
        "parlayOrder",
        JSON.stringify(order.map((p) => p.id))
      );
      return copy;
    });

    setActiveParlayId(newParlay.id);
  };

  const handleUpdateParlay = async (parlay: Parlay) => {
    setParlays((prev) => ({
      ...prev,
      [parlay.id]: {
        ...prev[parlay.id],
        ...parlay,
      },
    }));

    try {
      if (parlay.id in parlays) {
        await updateParlay(parlay);
      } else {
        const newParlay = await replaceParlay(parlay, parlay.name);
        setParlays((prev) => ({
          ...prev,
          [newParlay.id]: newParlay,
        }));
        setActiveParlayId(newParlay.id);
      }
    } catch (err) {
      console.error("Failed to update parlay:", err);
    }
  };

  const handleDeleteParlay = async (id: string) => {
    await deleteParlay(id);
    setParlays((prev) => {
      const copy = { ...prev };
      delete copy[id];
      // also update order in localStorage
      localStorage.setItem("parlayOrder", JSON.stringify(Object.keys(copy)));
      return copy;
    });
    if (activeParlayId === id) setActiveParlayId(null);
  };

  // Build the sorted list to pass down
  const savedOrder = localStorage.getItem("parlayOrder");
  const order = savedOrder ? (JSON.parse(savedOrder) as string[]) : [];
  const sortedParlays: Parlay[] = order
    .map((id) => parlays[id])
    .filter(Boolean);

  return (
    <div className="space-y-6">
      <ParlayList
        parlays={sortedParlays}
        activeParlayId={activeParlayId}
        setActiveParlayId={setActiveParlayId}
        onDelete={handleDeleteParlay}
        onUpdateParlay={handleUpdateParlay}
        setParlays={setParlays} // 👈 pass this for drag reorder
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
