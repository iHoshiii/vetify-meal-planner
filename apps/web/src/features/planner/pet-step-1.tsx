import { accountToday } from '@/auth/session';
import type { StepProps } from './pet-form-values';
import { FIELD, RequiredMarker, OptionalMarker, birthMonthForAge } from './pet-form-helpers';
import type { FormValues } from './pet-form-values';
import { ageFromBirthMonth } from '@vetify/planner-shared/pet-age';
export function PetStep1({ form, set, setForm }: StepProps) {
  return (
    <div className="grid gap-5 sm:grid-cols-2">
      <div className="min-w-0 text-sm font-bold text-slate-700">
        <label htmlFor="pet-age">
          Age
          <RequiredMarker show={form.ageValue === ''} />
        </label>
        <div className="mt-1.5 flex gap-2">
          <div className="min-w-0 flex-1">
            <input
              id="pet-age"
              className={FIELD}
              type="number"
              min="0"
              max={form.ageUnit === 'years' ? 200 : 2411}
              step="1"
              value={form.ageValue}
              onChange={(event) => {
                const ageValue = event.target.value;
                const birthMonth = birthMonthForAge(ageValue, form.ageUnit);
                setForm((previous) => ({
                  ...previous,
                  ageValue,
                  ageRemainderMonths: 0,
                  birthMonth,
                  birthMonthEstimated: Boolean(birthMonth),
                }));
              }}
              placeholder="e.g. 2"
              required
            />
          </div>
          <div className="w-28 shrink-0">
            <select
              aria-label="Age unit"
              className={`${FIELD} pr-8`}
              value={form.ageUnit}
              onChange={(event) => {
                const ageUnit = event.target.value as FormValues['ageUnit'];
                setForm((previous) => {
                  const value = Number(previous.ageValue);
                  if (previous.ageValue === '' || !Number.isInteger(value) || value < 0) {
                    return { ...previous, ageUnit };
                  }
                  const totalMonths =
                    previous.ageUnit === 'years' ? value * 12 + previous.ageRemainderMonths : value;
                  return {
                    ...previous,
                    ageUnit,
                    ageValue: String(
                      ageUnit === 'years' ? Math.floor(totalMonths / 12) : totalMonths,
                    ),
                    ageRemainderMonths: ageUnit === 'years' ? totalMonths % 12 : 0,
                  };
                });
              }}
            >
              <option value="years">Years</option>
              <option value="months">Months</option>
            </select>
          </div>
        </div>
      </div>
      <label className="block text-sm font-bold text-slate-700">
        Birth month and year
        <OptionalMarker />
        {form.birthMonthEstimated && (
          <span className="ml-2 text-xs font-normal text-amber-700">Estimated</span>
        )}
        <input
          className={`${FIELD} mt-1.5 pr-10`}
          type="month"
          min="1800-01"
          max={accountToday().slice(0, 7)}
          value={form.birthMonth}
          onChange={(event) => {
            const birthMonth = event.target.value;
            const age = birthMonth ? ageFromBirthMonth(birthMonth, accountToday()) : null;
            setForm((previous) => ({
              ...previous,
              birthMonth,
              birthMonthEstimated: false,
              ageValue: age
                ? String(previous.ageUnit === 'years' ? age.years : age.years * 12 + age.months)
                : previous.ageValue,
              ageRemainderMonths:
                age && previous.ageUnit === 'years' ? age.months : previous.ageRemainderMonths,
            }));
          }}
        />
      </label>
      <label className="block text-sm font-bold text-slate-700">
        Spayed or neutered?
        <OptionalMarker />
        <select
          className={`${FIELD} mt-1.5 pr-10`}
          value={form.neuterStatus}
          onChange={(event) =>
            set('neuterStatus', event.target.value as FormValues['neuterStatus'])
          }
        >
          <option value="prefer_not_to_say">Prefer not to say</option>
          <option value="yes">Yes</option>
          <option value="no">No</option>
        </select>
      </label>
      <label className="block text-sm font-bold text-slate-700">
        Pregnant or nursing?
        <OptionalMarker />
        <select
          className={`${FIELD} mt-1.5 pr-10`}
          value={form.pregnantOrNursing}
          onChange={(event) =>
            set('pregnantOrNursing', event.target.value as FormValues['pregnantOrNursing'])
          }
        >
          <option value="unknown">Unknown</option>
          <option value="no">No</option>
          <option value="yes">Yes</option>
        </select>
      </label>
    </div>
  );
}
