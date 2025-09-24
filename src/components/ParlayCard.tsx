import { useState, useMemo } from "react";
import { useParlayStore } from "../store/parlays";
import type { Leg, Parlay } from "../types";
import AddLegForm from "./AddLegForm";
import LegItem from "./LegItem";
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
} from "@hello-pangea/dnd";

interface Props {
  parlay: Parlay;
  isActive: boolean;
  setActiveParlayId: (id: string | null) => void;
  onDelete: (id: string) => void;
}

export default function ParlayCard({
  parlay,
  isActive,
  setActiveParlayId,
  onDelete,
}: Props) {
  const updateParlayName = useParlayStore((s) => s.updateParlayName);
  const legsRecord = useParlayStore((s) => s.legs);
  const removeLeg = useParlayStore((s) => s.removeLeg);
  const updateLegOrder = useParlayStore((s) => s.updateLegOrder);

  const [editingName, setEditingName] = useState(
    parlay.name.startsWith("Parlay")
  );

  const parlayLegs = useMemo(
    () =>
      Object.values(legsRecord)
        .filter((l) => l.parlayId === parlay.id)
        .reduce((acc, leg) => {
          if (
            !acc.find(
              (l2) =>
                l2.playerId === leg.playerId && l2.statType === leg.statType
            )
          ) {
            acc.push(leg);
          }
          return acc;
        }, [] as Leg[])
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
    [legsRecord, parlay.id]
  );

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const newLegs = Array.from(parlayLegs);
    const [removed] = newLegs.splice(result.source.index, 1);
    newLegs.splice(result.destination.index, 0, removed);
    updateLegOrder(
      parlay.id,
      newLegs.map((l) => l.id)
    );
  };

  return (
    <div className="p-4 border rounded bg-white space-y-3">
      {/* Parlay Name */}
      <div className="flex items-center gap-3">
        {editingName ? (
          <input
            value={parlay.name}
            onChange={(e) => updateParlayName(parlay.id, e.target.value)}
            onBlur={() => setEditingName(false)}
            onKeyDown={(e) => e.key === "Enter" && setEditingName(false)}
            className="text-lg font-semibold border px-2 py-1 rounded"
            autoFocus
          />
        ) : (
          <>
            <h2 className="text-lg font-semibold">
              {parlay.name || "Untitled Parlay"}
            </h2>
            <button
              onClick={() => setEditingName(true)}
              className="text-xs text-blue-500 underline"
            >
              Edit
            </button>
          </>
        )}

        <button
          onClick={() => setActiveParlayId(isActive ? null : parlay.id)}
          className="px-2 py-1 bg-blue-500 text-white rounded"
        >
          Add Leg
        </button>
        <button
          onClick={() => onDelete(parlay.id)}
          className="px-2 py-1 bg-red-500 text-white rounded"
        >
          Delete
        </button>
      </div>

      {/* Legs */}
      {parlayLegs.length === 0 ? (
        <div className="text-sm text-gray-500">No legs yet.</div>
      ) : (
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId={parlay.id}>
            {(provided) => (
              <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                className="space-y-2"
              >
                {parlayLegs.map((leg, index) => (
                  <Draggable key={leg.id} draggableId={leg.id} index={index}>
                    {(dragProvided, snapshot) => (
                      <div
                        ref={dragProvided.innerRef}
                        {...dragProvided.draggableProps}
                        {...dragProvided.dragHandleProps}
                        className={`flex gap-3 p-2 rounded border ${
                          snapshot.isDragging ? "bg-gray-100" : ""
                        }`}
                      >
                        <div className="flex-1">
                          <LegItem
                            playerId={leg.playerId}
                            statType={leg.statType}
                            targetValue={leg.target}
                            playerName={leg.playerName}
                          />
                        </div>
                        <button
                          onClick={() => removeLeg(leg.id)}
                          className="text-sm text-gray-600 underline self-start"
                        >
                          Remove
                        </button>
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      )}

      {/* Inline AddLegForm */}
      {isActive && (
        <AddLegForm
          parlay={parlay}
          onAddLeg={() => setActiveParlayId(null)}
          onCancel={() => setActiveParlayId(null)}
        />
      )}
    </div>
  );
}
