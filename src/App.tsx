// import { useState, useEffect } from "react";
// import ParlayCard from "./components/ParlayCard";
// import { RefreshButton } from "./components/RefreshButton";
// import type { Parlay } from "./types";

// export function App() {
//   const [parlays, setParlays] = useState<Parlay[]>(() => {
//     const stored = localStorage.getItem("parlays");
//     return stored ? JSON.parse(stored) : [{ id: "default", name: "My Parlay" }];
//   });

//   useEffect(() => {
//     localStorage.setItem("parlays", JSON.stringify(parlays));
//   }, [parlays]);

//   const addParlay = (name: string) => {
//     const id = `${name}-${Date.now()}`;
//     setParlays((prev) => [...prev, { id, name }]);
//   };

//   const deleteParlay = (parlayId: string) => {
//     setParlays((prev) => prev.filter((p) => p.id !== parlayId));
//     // You may also want to remove its legs from your parlay store
//   };

//   const refreshAll = () => {
//     window.dispatchEvent(new Event("refreshLegs"));
//   };

//   return (
//     <div className="max-w-2xl mx-auto mt-4 p-4">
//       <h1 className="text-2xl font-bold mb-4">Parlay Tracker</h1>

//       {/* Add new parlay */}
//       <div className="mb-4 flex gap-2">
//         <input
//           type="text"
//           placeholder="New Parlay Name"
//           id="new-parlay-input"
//           className="border px-2 py-1 rounded flex-1"
//         />
//         <button
//           className="bg-green-500 text-white px-3 py-1 rounded"
//           onClick={() => {
//             const input = document.getElementById(
//               "new-parlay-input"
//             ) as HTMLInputElement;
//             if (input.value.trim()) {
//               addParlay(input.value.trim());
//               input.value = "";
//             }
//           }}
//         >
//           Add Parlay
//         </button>
//       </div>

//       {/* List all parlays */}
//       <div className="space-y-4">
//         {parlays.map((parlay) => (
//           <ParlayCard key={parlay.id} parlay={parlay} />
//         ))}
//       </div>

//       {/* Global refresh button */}
//       <div className="mt-6 flex justify-center">
//         <RefreshButton onRefresh={refreshAll} />
//       </div>
//     </div>
//   );
// }
// App.tsx
import ParlayManager from "./components/ParlayManager";

export function App() {
  return (
    <div className="max-w-2xl mx-auto mt-4 p-4">
      <h1 className="text-2xl font-bold mb-4">Parlay Tracker</h1>
      <ParlayManager />
    </div>
  );
}
