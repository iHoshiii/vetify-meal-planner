import type { MealPlanInput } from '@vetify/planner-shared/meal-plans';

const field =
  'mt-1.5 w-full min-w-0 rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm text-slate-900 outline-hidden focus:border-teal-700 focus:ring-2 focus:ring-teal-100';
const label = 'block min-w-0 text-sm font-semibold text-slate-800';
export function FoodIdentityFields({
  value,
  set,
}: {
  value: MealPlanInput;
  set: (value: MealPlanInput) => void;
}) {
  const updateFood = (patch: Partial<MealPlanInput['food']>) =>
    set({ ...value, food: { ...value.food, ...patch } });
  return (
    <div className="contents">
      <label className={`${label} sm:col-span-2`}>
        Exact food name
        <input
          className={field}
          placeholder="e.g. Brand Adult Chicken dry food"
          value={value.food.name}
          onChange={(event) => updateFood({ name: event.target.value })}
          maxLength={120}
        />
      </label>
      <label className={label}>
        Label says
        <select
          className={field}
          value={value.food.adequacy}
          onChange={(event) =>
            updateFood({ adequacy: event.target.value as MealPlanInput['food']['adequacy'] })
          }
        >
          <option value="unknown">Not sure</option>
          <option value="complete">Complete and balanced</option>
          <option value="supplemental">Supplemental feeding only</option>
        </select>
      </label>
      <label className={label}>
        Food form
        <select
          className={field}
          value={value.food.form}
          onChange={(event) =>
            updateFood({ form: event.target.value as MealPlanInput['food']['form'] })
          }
        >
          <option value="dry">Dry</option>
          <option value="wet">Wet</option>
          <option value="other">Other</option>
        </select>
      </label>
      <label className={label}>
        Made for
        <select
          className={field}
          value={value.food.species}
          onChange={(event) =>
            updateFood({ species: event.target.value as MealPlanInput['food']['species'] })
          }
        >
          <option value="dog">Dogs</option>
          <option value="cat">Cats</option>
          <option value="other">Other</option>
        </select>
      </label>
      <label className={label}>
        Life stage on label
        <select
          className={field}
          value={value.food.lifeStage}
          onChange={(event) =>
            updateFood({ lifeStage: event.target.value as MealPlanInput['food']['lifeStage'] })
          }
        >
          <option value="unknown">Not sure</option>
          <option value="adult">Adult maintenance</option>
          <option value="growth">Growth</option>
          <option value="all">All life stages</option>
        </select>
      </label>
    </div>
  );
}
