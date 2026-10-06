import type { StepProps } from './pet-form-values';
import {
  FIELD,
  RequiredMarker,
  OptionalMarker,
  capitalizeFirstLetter,
  capitalizeListEntries,
} from './pet-form-helpers';
import type { FormValues } from './pet-form-values';
import { SHIH_TZU_WEIGHT_ENTRY_MAX_KG } from '@vetify/planner-shared/pets';
export function PetStep2({ form, set, shihTzu, weightAboveTypicalShihTzu }: StepProps) {
  return (
    <div className="grid gap-5 sm:grid-cols-2">
      <label className="block text-sm font-bold text-slate-700">
        Current weight (kg)
        <RequiredMarker show={form.weightKg === ''} />
        <input
          className={`${FIELD} mt-1.5`}
          type="number"
          min="0.01"
          max={shihTzu ? SHIH_TZU_WEIGHT_ENTRY_MAX_KG : 500}
          step="any"
          value={form.weightKg}
          onChange={(event) => set('weightKg', event.target.value)}
          placeholder="e.g. 6.2"
          required
        />
        {weightAboveTypicalShihTzu && (
          <span className="mt-1.5 block text-xs font-medium text-amber-700">
            Adult Shih Tzu breed standard: 4.5–8 kg. Please double-check this weight.
          </span>
        )}
      </label>
      <label className="block text-sm font-bold text-slate-700">
        Current food
        <OptionalMarker />
        <input
          className={`${FIELD} mt-1.5 h-16`}
          value={form.currentFood}
          onChange={(event) => set('currentFood', capitalizeFirstLetter(event.target.value))}
          placeholder="e.g. Brand and recipe"
          maxLength={120}
        />
      </label>
      <label className="block text-sm font-bold text-slate-700">
        Feeding goal
        <OptionalMarker />
        <select
          className={`${FIELD} mt-1.5 pr-10`}
          value={form.feedingGoal}
          onChange={(event) => set('feedingGoal', event.target.value as FormValues['feedingGoal'])}
        >
          <option value="unsure">Unsure</option>
          <option value="maintain">Maintain weight</option>
          <option value="gain">Gain weight</option>
          <option value="lose">Lose weight</option>
        </select>
      </label>
      <label className="block text-sm font-bold text-slate-700">
        Allergies or food reactions
        <OptionalMarker />
        <textarea
          className={`${FIELD} mt-1.5`}
          rows={2}
          placeholder="e.g. Beef, chicken (separate with commas)"
          value={form.allergies}
          onChange={(event) => set('allergies', capitalizeListEntries(event.target.value))}
        />
      </label>
    </div>
  );
}
