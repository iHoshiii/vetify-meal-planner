import { accountToday } from '@/auth/session';
import type { MealPlanInput } from '@vetify/planner-shared/meal-plans';
import type { Pet } from '@vetify/planner-shared/pets';

const field =
  'mt-1.5 w-full min-w-0 rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm text-slate-900 outline-hidden focus:border-teal-700 focus:ring-2 focus:ring-teal-100';
const label = 'block min-w-0 text-sm font-semibold text-slate-800';
export function FoodEnergyFields({
  pet,
  value,
  set,
}: {
  pet: Pet;
  value: MealPlanInput;
  set: (value: MealPlanInput) => void;
}) {
  const updateFood = (patch: Partial<MealPlanInput['food']>) =>
    set({ ...value, food: { ...value.food, ...patch } });
  return (
    <div className="contents">
      <label className={label}>
        Calories printed per
        <select
          className={field}
          value={value.food.calorieBasis}
          onChange={(event) =>
            updateFood({
              calorieBasis: event.target.value as MealPlanInput['food']['calorieBasis'],
              calories: null,
            })
          }
        >
          <option value="kg">Kilogram</option>
          <option value="package">Can or pouch</option>
        </select>
      </label>
      <label className={label}>
        Label calories, kcal/{value.food.calorieBasis === 'kg' ? 'kg' : 'package'}
        <input
          className={field}
          type="number"
          min="1"
          max="10000"
          step="any"
          placeholder={value.food.calorieBasis === 'kg' ? 'e.g. 3500' : 'e.g. 85'}
          value={value.food.calories ?? ''}
          onChange={(event) =>
            updateFood({ calories: event.target.value ? Number(event.target.value) : null })
          }
        />
      </label>
      {value.food.calorieBasis === 'package' && (
        <label className={label}>
          Net food weight per can or pouch, g
          <input
            className={field}
            type="number"
            min="1"
            max="5000"
            step="any"
            placeholder="e.g. 85"
            value={value.food.packageGrams ?? ''}
            onChange={(event) =>
              updateFood({ packageGrams: event.target.value ? Number(event.target.value) : null })
            }
          />
        </label>
      )}
      <label className={`${label} sm:col-span-2`}>
        Where did the calorie figure come from?{' '}
        {value.mode === 'manual' && <span className="font-normal text-slate-500">(optional)</span>}
        <input
          className={field}
          placeholder="e.g. Bag label or manufacturer website"
          value={value.food.labelSource}
          onChange={(event) => updateFood({ labelSource: event.target.value })}
          maxLength={180}
        />
      </label>
      <label className={label}>
        Date label was checked{' '}
        {value.mode === 'manual' && <span className="font-normal text-slate-500">(optional)</span>}
        <input
          className={field}
          type="date"
          max={accountToday()}
          value={value.food.labelCheckedOn ?? ''}
          onChange={(event) => updateFood({ labelCheckedOn: event.target.value || null })}
        />
      </label>
      <label className={label}>
        Treats and other extras, kcal/day{' '}
        <span className="font-normal text-slate-500">(0 if none)</span>
        <input
          className={field}
          type="number"
          min="0"
          max="5000"
          step="any"
          placeholder="Unknown"
          value={value.extrasKcal ?? ''}
          onChange={(event) =>
            set({
              ...value,
              extrasKcal: event.target.value === '' ? null : Number(event.target.value),
            })
          }
        />
      </label>
      <p className="self-end rounded-xl bg-amber-50 p-3 text-sm text-amber-950">
        Check the exact package. A different formula or size may have different calories.{' '}
        {pet.allergies.length ? 'Review the reported food reactions before using this food.' : ''}
      </p>
    </div>
  );
}
