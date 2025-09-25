import { supabase } from "./supabase";
import type { Parlay, Leg } from "../types";

// Add a new parlay
export async function addParlay(name: string, order: number): Promise<Parlay> {
  const { data, error } = await supabase
    .from("parlays")
    .insert([{ name, order_index: order }])
    .select()
    .single();
  if (error) throw error;

  return { id: data.id, name: data.name, order: data.order_index, legs: [] };
}

// export async function replaceParlay(
//   oldParlay: Parlay,
//   newName: string
// ): Promise<Parlay> {
//   // Step 1: add new parlay (just like addParlay)
//   const newParlay: Parlay = await addParlay(newName, oldParlay.order ?? 0);

//   // Step 2: return new parlay (no legs copied)
//   return newParlay;
// }
// lib/parlays.ts
export async function replaceParlay(
  parlay: Parlay,
  newName: string
): Promise<Parlay> {
  // 1. Add new parlay row
  const { data: newParlayData, error: insertErr } = await supabase
    .from("parlays")
    .insert([{ name: newName, order_index: parlay.order ?? 0 }])
    .select()
    .single();
  if (insertErr) throw insertErr;

  // 2. Delete old parlay row
  const { error: deleteErr } = await supabase
    .from("parlays")
    .delete()
    .eq("id", parlay.id);
  if (deleteErr) throw deleteErr;

  // 3. Return new parlay object
  return {
    id: newParlayData.id,
    name: newParlayData.name,
    order: newParlayData.order_index,
    legs: [], // legs don't matter for title change
  };
}

// Update existing parlay
export async function updateParlay(parlay: Parlay): Promise<void> {
  const { error } = await supabase
    .from("parlays")
    .update({ name: parlay.name, order_index: parlay.order })
    .eq("id", parlay.id);
  if (error) throw error;

  // Upsert legs
  for (const leg of parlay.legs) {
    if (!leg.id) {
      const { data, error: insertErr } = await supabase
        .from("legs")
        .insert([
          {
            parlay_id: parlay.id,
            player_id: leg.playerId,
            player_name: leg.playerName,
            stat_type: leg.statType,
            target: leg.targetValue,
            headshot_url: leg.headshotUrl,
            order_index: leg.order ?? 0,
          },
        ])
        .select()
        .single();
      if (insertErr) throw insertErr;
      leg.id = data.id;
    } else {
      const { error: updateErr } = await supabase
        .from("legs")
        .update({
          player_id: leg.playerId,
          player_name: leg.playerName,
          stat_type: leg.statType,
          target: leg.targetValue,
          headshot_url: leg.headshotUrl,
          order_index: leg.order ?? 0,
        })
        .eq("id", leg.id);
      if (updateErr) throw updateErr;
    }
  }
}

// Update the order of parlays
export async function updateParlayOrder(
  parlays: { id: string; order: number }[]
) {
  for (const p of parlays) {
    const { error } = await supabase
      .from("parlays")
      .update({ order_index: p.order })
      .eq("id", p.id);
    if (error) throw error;
  }
}

// Update the order of legs in a parlay
export async function updateLegOrder(
  parlayId: string,
  legs: { id: string; order: number }[]
) {
  for (const l of legs) {
    const { error } = await supabase
      .from("legs")
      .update({ order_index: l.order })
      .eq("id", l.id);
    if (error) throw error;
  }
}

// Delete parlay and all its legs
export async function deleteParlay(parlayId: string): Promise<void> {
  await supabase.from("legs").delete().eq("parlay_id", parlayId);
  const { error } = await supabase.from("parlays").delete().eq("id", parlayId);
  if (error) throw error;
}

// Delete single leg
export async function deleteLeg(legId: string): Promise<void> {
  const { error } = await supabase.from("legs").delete().eq("id", legId);
  if (error) throw error;
}

// Load all parlays with legs
export async function loadParlays(): Promise<Record<string, Parlay>> {
  const { data: parlays, error: pErr } = await supabase
    .from("parlays")
    .select("*")
    .order("order_index", { ascending: true });
  if (pErr) throw pErr;

  const { data: legs, error: lErr } = await supabase
    .from("legs")
    .select("*")
    .order("order_index", { ascending: true });
  if (lErr) throw lErr;

  const mapped: Record<string, Parlay> = {};
  parlays.forEach((p) => {
    mapped[p.id] = {
      id: p.id,
      name: p.name,
      order: p.order_index,
      legs: legs
        .filter((l) => l.parlay_id === p.id)
        .map((l) => ({
          id: l.id,
          parlayId: l.parlay_id,
          playerId: l.player_id,
          playerName: l.player_name,
          statType: l.stat_type,
          target: l.target,
          targetValue: l.target,
          headshotUrl: l.headshot_url,
          order: l.order_index,
        })),
    };
  });

  return mapped;
}
