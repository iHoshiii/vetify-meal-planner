const field =
  'mt-1 w-full min-w-0 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-hidden focus:border-teal-700 focus:ring-2 focus:ring-teal-100';

export function MealEntryFields({
  index,
  unit,
  amount,
  extras,
  note,
  onAmount,
  onUnit,
  onExtras,
  onNote,
}: {
  index: number;
  unit: 'g' | 'oz';
  amount: string;
  extras: string;
  note: string;
  onAmount: (value: string) => void;
  onUnit: (value: 'g' | 'oz') => void;
  onExtras: (value: string) => void;
  onNote: (value: string) => void;
}) {
  return (
    <>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="text-xs font-bold text-slate-600">
          Amount eaten
          <div className="mt-1 flex gap-2">
            <input
              className={`${field} mt-0`}
              aria-label={`Meal ${index + 1} amount eaten`}
              type="number"
              min="0"
              max={unit === 'g' ? 5000 : 176.37}
              step="any"
              value={amount}
              onChange={(event) => onAmount(event.target.value)}
            />
            <select
              className="rounded-lg border border-slate-300 bg-white px-2 text-sm"
              aria-label={`Meal ${index + 1} weight unit`}
              value={unit}
              onChange={(event) => onUnit(event.target.value as 'g' | 'oz')}
            >
              <option value="g">g</option>
              <option value="oz">oz</option>
            </select>
          </div>
        </label>
        <label className="text-xs font-bold text-slate-600">
          Treats or extras, kcal
          <input
            className={field}
            type="number"
            min="0"
            max="5000"
            step="any"
            value={extras}
            onChange={(event) => onExtras(event.target.value)}
          />
        </label>
      </div>
      <details className="mt-3 text-xs text-slate-600">
        <summary className="cursor-pointer font-semibold">Add note</summary>
        <input
          className={field}
          value={note}
          maxLength={300}
          placeholder="Optional"
          onChange={(event) => onNote(event.target.value)}
        />
      </details>
    </>
  );
}
