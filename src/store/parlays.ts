import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Leg, Parlay, StatType } from "../types/index";

type State = {
  parlays: Record<string, Parlay>;
  legs: Record<string, Leg>;
};

type Actions = {
  addParlay: (name: string) => string;
  addLeg: (leg: Leg) => string;
  removeLeg: (id: string) => void;
  removeParlay: (parlayId: string) => void;
  updateLegOrder: (parlayId: string, legIds: string[]) => void;
  moveLegBetweenParlays: (
    legId: string,
    fromParlayId: string,
    toParlayId: string,
    toIndex: number
  ) => void;
  updateParlayName: (id: string, name: string) => void;
  updateParlayOrder: (ids: string[]) => void;
};

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

export const useParlayStore = create<State & Actions>()(
  persist(
    (set, get) => ({
      parlays: {},
      legs: {},

      addParlay: (name) => {
        const id = uid();
        set((s) => ({ parlays: { ...s.parlays, [id]: { id, name } } }));
        return id;
      },

      addLeg: (leg) => {
        const id = `${leg.parlayId}-${leg.playerId}-${leg.statType}`;
        set((s) => {
          if (s.legs[id]) return s; // already exists
          const parlayLegs = Object.values(s.legs)
            .filter((l) => l.parlayId === leg.parlayId)
            .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
          const order = parlayLegs.length;

          return {
            legs: { ...s.legs, [id]: { ...leg, id, order } },
          };
        });
        return id;
      },

      removeLeg: (id) =>
        set((s) => {
          const { [id]: _, ...rest } = s.legs;
          return { legs: rest };
        }),

      removeParlay: (parlayId) =>
        set((s) => {
          const legs = Object.fromEntries(
            Object.entries(s.legs).filter(([_, l]) => l.parlayId !== parlayId)
          );
          const { [parlayId]: _, ...parlays } = s.parlays;
          return { legs, parlays };
        }),
      updateParlayName: (id, name) =>
        set((state) => {
          if (!state.parlays[id]) return state; // nothing to update
          return {
            parlays: {
              ...state.parlays,
              [id]: { ...state.parlays[id], name },
            },
          };
        }),
      updateLegOrder: (parlayId, legIds) =>
        set((s) => {
          const legs = { ...s.legs };
          legIds.forEach((id, index) => {
            if (legs[id]) legs[id].order = index;
          });
          return { legs };
        }),

      moveLegBetweenParlays: (legId, fromParlayId, toParlayId, toIndex) =>
        set((s) => {
          const legs = { ...s.legs };
          if (!legs[legId]) return { legs };
          legs[legId].parlayId = toParlayId;

          // Reorder legs in destination parlay
          const destLegs = Object.values(legs)
            .filter((l) => l.parlayId === toParlayId && l.id !== legId)
            .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

          destLegs.splice(toIndex, 0, legs[legId]);

          destLegs.forEach((l, idx) => (l.order = idx));

          return { legs };
        }),

      updateParlayOrder: (ids) =>
        set((state) => {
          const newParlays = { ...state.parlays };
          ids.forEach((id, idx) => {
            if (newParlays[id]) {
              newParlays[id] = { ...newParlays[id], order: idx };
            }
          });
          return { parlays: newParlays };
        }),
    }),
    { name: "parlay-tracker" }
  )
);
