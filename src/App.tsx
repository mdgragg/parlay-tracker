import ParlayManager from "./components/ParlayManager";
import "./index.css";

export function App() {
  return (
    <div className="max-w-2xl mx-auto mt-4 p-4">
      <h1 className="text-2xl font-bold mb-4">Parlay Tracker</h1>
      <ParlayManager />
    </div>
  );
}
