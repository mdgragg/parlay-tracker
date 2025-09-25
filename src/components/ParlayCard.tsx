import { useState, useMemo } from "react";
import type { Parlay, Leg } from "../types";
import AddLegForm from "./AddLegForm";
import LegItem from "./LegItem";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { deleteLeg } from "../lib/parlays";
import { updateLegOrder } from "../lib/parlays";

interface Props {
  parlay: Parlay;
  isActive: boolean;
  setActiveParlayId: (id: string | null) => void;
  onDelete: (id: string) => void;
  onUpdateParlay: (parlay: Parlay) => void;
}

export default function ParlayCard({
  parlay,
  isActive,
  setActiveParlayId,
  onDelete,
  onUpdateParlay,
}: Props) {
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(parlay.name);

  const parlayLegs = useMemo(() => {
    const savedOrder = localStorage.getItem(`parlayLegOrder-${parlay.id}`);
    let legsCopy = [...parlay.legs];

    if (savedOrder) {
      const order = JSON.parse(savedOrder) as { id: string; order: number }[];
      legsCopy.sort((a, b) => {
        const aOrder = order.find((o) => o.id === a.id)?.order ?? a.order ?? 0;
        const bOrder = order.find((o) => o.id === b.id)?.order ?? b.order ?? 0;
        return aOrder - bOrder;
      });
    } else {
      legsCopy.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    }

    return legsCopy;
  }, [parlay.legs, parlay.id]);

  const handleNameBlur = () => {
    if (nameInput.trim() && nameInput !== parlay.name) {
      onUpdateParlay({ ...parlay, name: nameInput }); // call the generic update function
    }
    setEditingName(false);
  };

  const handleDragEnd = (result: any) => {
    if (!result.destination) return;
    const newLegs = Array.from(parlayLegs);
    const [removed] = newLegs.splice(result.source.index, 1);
    newLegs.splice(result.destination.index, 0, removed);

    newLegs.forEach((l, idx) => (l.order = idx));
    onUpdateParlay({ ...parlay, legs: newLegs });

    // Save order in localStorage
    localStorage.setItem(
      `parlayLegOrder-${parlay.id}`,
      JSON.stringify(newLegs.map((l) => ({ id: l.id, order: l.order ?? 0 })))
    );
  };

  const handleAddLeg = (leg: Leg) => {
    onUpdateParlay({ ...parlay, legs: [...parlay.legs, leg] });
    setActiveParlayId(null);
  };

  const handleRemoveLeg = async (legId: string) => {
    await deleteLeg(legId);
    onUpdateParlay({
      ...parlay,
      legs: parlay.legs.filter((l) => l.id !== legId),
    });
  };

  return (
    <div className="p-4 border rounded parlay-card space-y-3">
      <div className="parlay-btns">
        {editingName ? (
          <input
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            onBlur={handleNameBlur}
            onKeyDown={(e) => e.key === "Enter" && handleNameBlur()}
            className="text-lg font-semibold border px-2 py-1 rounded"
            autoFocus
          />
        ) : (
          <>
            <h2 className="text-lg font-semibold">{parlay.name}</h2>
            <span onClick={() => setEditingName(true)} className="edit-btn">
              Edit
            </span>
          </>
        )}

        <span
          onClick={() => setActiveParlayId(isActive ? null : parlay.id)}
          className="add-btn"
        >
          +
        </span>
        <span onClick={() => onDelete(parlay.id)} className="delete-btn">
          -
        </span>
      </div>

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
                            onRemove={() => handleRemoveLeg(leg.id)}
                          />
                        </div>
                        {/* <button
                          onClick={() => handleRemoveLeg(leg.id)}
                          className="delete"
                        >
                          Remove
                        </button> */}
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

      {isActive && <AddLegForm parlay={parlay} onLegAdded={handleAddLeg} />}
    </div>
  );
}
