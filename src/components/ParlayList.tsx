import ParlayCard from "./ParlayCard";
import type { Parlay } from "../types";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";

interface Props {
  parlays: Parlay[];
  activeParlayId: string | null;
  setActiveParlayId: (id: string | null) => void;
  onDelete: (id: string) => void;
  onUpdateParlay: (parlay: Parlay) => void;
  setParlays: React.Dispatch<React.SetStateAction<Record<string, Parlay>>>;
}

export default function ParlayList({
  parlays,
  activeParlayId,
  setActiveParlayId,
  onDelete,
  onUpdateParlay,
  setParlays,
}: Props) {
  const handleDragEnd = (result: any) => {
    if (!result.destination) return;
    const newParlays = Array.from(parlays);
    const [removed] = newParlays.splice(result.source.index, 1);
    newParlays.splice(result.destination.index, 0, removed);

    // Update order locally
    newParlays.forEach((p, idx) => (p.order = idx));
    newParlays.forEach((p) => onUpdateParlay(p));

    // Save order in localStorage
    localStorage.setItem(
      "parlayOrder",
      JSON.stringify(newParlays.map((p) => p.id))
    );

    // Update state in manager
    setParlays((prev) => {
      const copy = { ...prev };
      newParlays.forEach((p) => (copy[p.id] = p));
      return copy;
    });
  };

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <Droppable droppableId="parlays">
        {(provided) => (
          <div ref={provided.innerRef} {...provided.droppableProps}>
            {parlays.map((p, index) => (
              <Draggable key={p.id} draggableId={p.id} index={index}>
                {(dragProvided) => (
                  <div
                    ref={dragProvided.innerRef}
                    {...dragProvided.draggableProps}
                    {...dragProvided.dragHandleProps}
                    className="mb-4"
                  >
                    <ParlayCard
                      parlay={p}
                      isActive={activeParlayId === p.id}
                      setActiveParlayId={setActiveParlayId}
                      onDelete={onDelete}
                      onUpdateParlay={onUpdateParlay}
                    />
                  </div>
                )}
              </Draggable>
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </DragDropContext>
  );
}
