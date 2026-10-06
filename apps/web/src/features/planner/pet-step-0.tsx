import type { StepProps } from './pet-form-values';
import { FIELD, RequiredMarker, OptionalMarker, capitalizeFirstLetter } from './pet-form-helpers';
import type { FormValues } from './pet-form-values';
export function PetStep0({ form, set }: StepProps) {
  return (
    <div className="grid gap-5 sm:grid-cols-2">
      <label className="block text-sm font-bold text-slate-700">
        Pet name
        <RequiredMarker show={!form.name.trim()} />
        <input
          className={`${FIELD} mt-1.5`}
          value={form.name}
          onChange={(event) => set('name', capitalizeFirstLetter(event.target.value))}
          placeholder="e.g. Milo"
          maxLength={60}
          required
        />
      </label>
      <label className="block text-sm font-bold text-slate-700">
        Species
        <RequiredMarker show={!form.species.trim()} />
        <input
          className={`${FIELD} mt-1.5`}
          value={form.species}
          onChange={(event) => set('species', capitalizeFirstLetter(event.target.value))}
          placeholder="e.g. Dog, Cat, or Rabbit"
          maxLength={60}
          required
        />
      </label>
      <label className="block text-sm font-bold text-slate-700">
        Breed
        <OptionalMarker />
        <input
          className={`${FIELD} mt-1.5`}
          value={form.breed}
          onChange={(event) => set('breed', capitalizeFirstLetter(event.target.value))}
          placeholder="e.g. Shih Tzu"
          maxLength={80}
        />
      </label>
      <label className="block text-sm font-bold text-slate-700">
        Sex
        <OptionalMarker />
        <select
          className={`${FIELD} mt-1.5 pr-10`}
          value={form.sex}
          onChange={(event) => set('sex', event.target.value as FormValues['sex'])}
        >
          <option value="unknown">Unknown</option>
          <option value="male">Male</option>
          <option value="female">Female</option>
        </select>
      </label>
    </div>
  );
}
