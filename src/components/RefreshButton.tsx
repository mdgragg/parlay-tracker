export function RefreshButton({ onRefresh }: { onRefresh: () => void }) {
  return (
    <button
      onClick={onRefresh}
      className="px-2 py-1 text-xs rounded bg-gray-200 hover:bg-gray-300"
    >
      🔄 Refresh Stats
    </button>
  );
}
