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
  const [descriptionInput, setDescriptionInput] = useState(
    parlay.description ?? "",
  );
  const [legStatuses, setLegStatuses] = useState<
    Map<string, { percentage: number; color: string }>
  >(new Map());
  const [legsExpanded, setLegsExpanded] = useState(false);

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

  const handleSaveEdits = () => {
    const trimmedName = nameInput.trim();
    const trimmedDescription = descriptionInput.trim();
    const nameChanged = trimmedName && trimmedName !== parlay.name;
    const descriptionChanged = trimmedDescription !== (parlay.description ?? "");

    if (nameChanged || descriptionChanged) {
      onUpdateParlay({
        ...parlay,
        name: trimmedName || parlay.name,
        description: trimmedDescription,
      });
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
      JSON.stringify(newLegs.map((l) => ({ id: l.id, order: l.order ?? 0 }))),
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

  const handleCancelEdits = () => {
    setNameInput(parlay.name);
    setDescriptionInput(parlay.description ?? "");
    setEditingName(false);
  };

  const handleLegStatusChange = (
    legId: string,
    percentage: number,
    color: string
  ) => {
    setLegStatuses((prev) => {
      const newStatuses = new Map(prev);
      newStatuses.set(legId, { percentage, color });
      return newStatuses;
    });
  };

  const parlayStatus = useMemo(() => {
    if (legStatuses.size === 0) {
      return { percentage: 0, color: "#9ca3af" };
    }

    const percentages = Array.from(legStatuses.values()).map(
      (s) => s.percentage
    );
    const colors = Array.from(legStatuses.values()).map((s) => s.color);

    const avgPercentage =
      percentages.reduce((a, b) => a + b, 0) / percentages.length;

    const greenCount = colors.filter((c) => c === "#3be489").length;
    const yellowCount = colors.filter((c) => c === "#eab308").length;
    const redCount = colors.filter((c) => c === "#dc2626").length;

    let parlayColor = "#dc2626";
    if (redCount === 0 && yellowCount === 0) {
      parlayColor = "#3be489";
    } else if (redCount === 0) {
      parlayColor = "#eab308";
    }

    return { percentage: avgPercentage, color: parlayColor };
  }, [legStatuses]);

  return (
    <div className="p-4 border rounded parlay-card space-y-3">
      <div className="parlay-btns" style={{ textAlign: "center" }}>
        {editingName ? (
          <div className="title-edit-group" style={{ flexDirection: "column" }}>
            <input
              type="text"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSaveEdits()}
              className="title-input"
              style={{ fontSize: "1.125rem", fontWeight: 600 }}
              autoFocus
            />
            <input
              type="text"
              value={descriptionInput}
              onChange={(e) => setDescriptionInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSaveEdits()}
              className="title-input"
              placeholder="Add a note..."
              style={{ fontSize: "0.9rem", fontWeight: 400, margin: "0.5rem auto" }}
            />
            <div className="title-edit-buttons">
              <button
                type="button"
                onClick={handleSaveEdits}
                className="btn-save-title"
              >
                Save
              </button>
              <button
                type="button"
                onClick={handleCancelEdits}
                className="btn-cancel-title"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <>
            <h2 className="text-lg parlay-title font-semibold">
              {parlay.name}
            </h2>
            <span
              onClick={() => setEditingName(true)}
              className="edit-btn"
              style={{ cursor: "pointer" }}
            >
              Edit
            </span>
          </>
        )}

        <span
          onClick={() => setActiveParlayId(isActive ? null : parlay.id)}
          className="add-btn"
          style={{ cursor: "pointer" }}
        >
          +
        </span>
        <span
          onClick={() => onDelete(parlay.id)}
          className="delete-btn"
          style={{ cursor: "pointer" }}
        >
          -
        </span>
      </div>

      {!editingName && parlay.description && (
        <p className="parlay-subtitle">{parlay.description}</p>
      )}

      {parlay.legs.length > 0 && (
        <div className="parlay-progress">
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "0.5rem",
            }}
          >
            <div style={{ fontSize: "0.875rem" }}>
              <span style={{ fontWeight: 600 }}>Parlay Progress:</span>
              <span style={{ marginLeft: "0.5rem" }}>
                {parlayStatus.percentage.toFixed(0)}%
              </span>
            </div>
            <button
              onClick={() => setLegsExpanded(!legsExpanded)}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                fontSize: "1.25rem",
                padding: "0.25rem 0.5rem",
                display: "flex",
                alignItems: "center",
                color: "#666",
              }}
              title={legsExpanded ? "Collapse legs" : "Expand legs"}
            >
              {legsExpanded ? "▲" : "▼"}
            </button>
          </div>
          <div
            className="progress-bar"
            style={{
              height: "0.75rem",
              backgroundColor: "#e5e7eb",
              borderRadius: "0.375rem",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                height: "100%",
                width: `${parlayStatus.percentage}%`,
                background: parlayStatus.color,
                transition: "width 0.5s ease, background 0.5s ease",
              }}
            />
          </div>
        </div>
      )}

      {isActive && <AddLegForm parlay={parlay} onLegAdded={handleAddLeg} />}

      {legsExpanded && (
        <>
          {parlayLegs.length === 0 ? (
            <div className="text-sm text-gray-500">No legs yet.</div>
          ) : (
            <DragDropContext onDragEnd={handleDragEnd}>
              <Droppable droppableId={parlay.id} isDropDisabled={!editingName}>
                {(provided) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className="space-y-2"
                  >
                    {parlayLegs.map((leg, index) => (
                      <Draggable
                        key={leg.id}
                        draggableId={leg.id}
                        index={index}
                        isDragDisabled={!editingName}
                      >
                        {(dragProvided, snapshot) => (
                          <div
                            ref={dragProvided.innerRef}
                            {...dragProvided.draggableProps}
                            {...(editingName ? dragProvided.dragHandleProps : {})}
                            className={`flex gap-3 p-2 rounded border ${
                              snapshot.isDragging ? "bg-gray-100" : ""
                            }`}
                            style={{
                              ...dragProvided.draggableProps.style,
                              cursor: editingName ? "grab" : "default",
                            }}
                          >
                            <div className="flex-1">
                              <LegItem
                                playerId={leg.playerId}
                                statType={leg.statType}
                                targetValue={leg.target}
                                playerName={leg.playerName}
                                onRemove={() => handleRemoveLeg(leg.id)}
                                legId={leg.id}
                                onStatusChange={handleLegStatusChange}
                              />
                            </div>
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
        </>
      )}
    </div>
  );
}
