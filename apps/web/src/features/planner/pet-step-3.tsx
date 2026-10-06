import type { StepProps } from './pet-form-values';
import {
  FIELD,
  OptionalMarker,
  capitalizeFirstLetter,
  capitalizeListEntries,
} from './pet-form-helpers';
import type { FormValues } from './pet-form-values';
export function PetStep3({ form, set }: StepProps) {
  return (
    <div className="grid gap-5 sm:grid-cols-2">
      <label className="block text-sm font-bold text-slate-700">
        Health conditions
        <OptionalMarker />
        <textarea
          className={`${FIELD} mt-1.5`}
          rows={2}
          placeholder="e.g. Arthritis, diabetes (separate with commas)"
          value={form.healthConditions}
          onChange={(event) => set('healthConditions', capitalizeListEntries(event.target.value))}
        />
      </label>
      <label className="block text-sm font-bold text-slate-700">
        Body condition score
        <OptionalMarker />
        <select
          className={`${FIELD} mt-1.5 pr-10`}
          value={form.bodyConditionScore ?? ''}
          onChange={(event) =>
            set('bodyConditionScore', event.target.value ? Number(event.target.value) : null)
          }
        >
          <option value="">Not sure</option>
          {Array.from({ length: 10 }, (_, index) => (
            <option key={index + 1} value={index + 1}>
              {index + 1} of 10
            </option>
          ))}
        </select>
      </label>
      <label className="block text-sm font-bold text-slate-700">
        Activity level
        <OptionalMarker />
        <select
          className={`${FIELD} mt-1.5 pr-10`}
          value={form.activityLevel}
          onChange={(event) =>
            set('activityLevel', event.target.value as FormValues['activityLevel'])
          }
        >
          <option value="unknown">Unknown</option>
          <option value="low">Low</option>
          <option value="moderate">Moderate</option>
          <option value="high">High</option>
        </select>
      </label>
      <label className="block text-sm font-bold text-slate-700">
        Food preferences
        <OptionalMarker />
        <textarea
          className={`${FIELD} mt-1.5 h-16`}
          rows={2}
          value={form.foodPreferences}
          onChange={(event) => set('foodPreferences', capitalizeFirstLetter(event.target.value))}
          placeholder="e.g. Wet food or preferred flavors"
          maxLength={500}
        />
      </label>
    </div>
  );
}
