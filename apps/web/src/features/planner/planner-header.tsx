import { Plus } from 'lucide-react';

export function PlannerHeader({
  count,
  showAdd,
  onAdd,
}: {
  count?: number;
  showAdd: boolean;
  onAdd: () => void;
}) {
  return (
    <header className="mb-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight text-[#163b35]">Meal planner</h1>
        </div>
        {showAdd && Boolean(count) && (
          <button
            type="button"
            onClick={onAdd}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#176f62] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#11594f] focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-teal-700 focus-visible:ring-offset-2"
          >
            <Plus size={18} strokeWidth={2.5} aria-hidden="true" /> Add Pet
          </button>
        )}
      </div>
    </header>
  );
}
