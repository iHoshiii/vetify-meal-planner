import { PawPrint, Plus } from 'lucide-react';

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
    <header className="relative mb-7 overflow-hidden rounded-[1.75rem] border border-[#dbeae4] bg-gradient-to-br from-[#eaf7f1] via-white to-[#f8fbf8] px-6 py-7 shadow-xs sm:px-8 sm:py-9">
      <PawPrint
        size={148}
        strokeWidth={1.1}
        aria-hidden="true"
        className="pointer-events-none absolute -right-6 -top-10 rotate-[-18deg] text-teal-800/[0.07]"
      />
      <div className="relative flex flex-wrap items-center justify-between gap-5">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-[#163b35] sm:text-4xl">
            Meal planner
          </h1>
          {showAdd && count !== undefined && (
            <p className="mt-2 text-sm font-medium text-[#54716a]">
              {count} {count === 1 ? 'pet' : 'pets'}
            </p>
          )}
        </div>
        {showAdd && Boolean(count) && (
          <button
            type="button"
            onClick={onAdd}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#176f62] px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-teal-900/15 hover:bg-[#11594f] focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-teal-700 focus-visible:ring-offset-2"
          >
            <Plus size={18} strokeWidth={2.5} aria-hidden="true" /> Add Pet
          </button>
        )}
      </div>
    </header>
  );
}
