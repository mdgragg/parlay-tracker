import ParlayCard from "./ParlayCard";
import type { Parlay } from "../types";
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
} from "@hello-pangea/dnd";
import { useParlayStore } from "../store/parlays";

interface Props {
  parlays: Parlay[];
  activeParlayId: string | null;
  setActiveParlayId: (id: string | null) => void;
  onDelete: (id: string) => void;
}

export default function ParlayList({
  parlays,
  activeParlayId,
  setActiveParlayId,
  onDelete,
}: Props) {
  const updateParlayOrder = useParlayStore((s) => s.updateParlayOrder);

  if (!parlays.length) {
    return (
      <div className="text-sm text-gray-500">
        Create a parlay by adding your first leg.
      </div>
    );
  }

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const newParlays = Array.from(parlays);
    const [removed] = newParlays.splice(result.source.index, 1);
    newParlays.splice(result.destination.index, 0, removed);

    // Persist the new order
    updateParlayOrder(newParlays.map((p) => p.id));
  };

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <Droppable droppableId="parlay-list">
        {(provided) => (
          <div
            className="space-y-4"
            ref={provided.innerRef}
            {...provided.droppableProps}
          >
            {parlays.map((parlay, index) => (
              <Draggable key={parlay.id} draggableId={parlay.id} index={index}>
                {(dragProvided, snapshot) => (
                  <div
                    ref={dragProvided.innerRef}
                    {...dragProvided.draggableProps}
                    {...dragProvided.dragHandleProps}
                    className={`${
                      snapshot.isDragging ? "bg-gray-50" : ""
                    } rounded`}
                  >
                    <ParlayCard
                      parlay={parlay}
                      isActive={activeParlayId === parlay.id}
                      setActiveParlayId={setActiveParlayId}
                      onDelete={onDelete}
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
