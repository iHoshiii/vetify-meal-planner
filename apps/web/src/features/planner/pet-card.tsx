import { ownerQueryKey } from '@/auth/session';
import type { Pet } from '@vetify/planner-shared/pets';
import { petAge } from '@vetify/planner-shared/pet-age';
import { useQuery } from '@tanstack/react-query';
import { CalendarDays, Cat, Dog, PawPrint, Scale } from 'lucide-react';

import { getMealPlans } from '@/services/meal-plans.service';

function ageLabel(pet: Pet, today: string): string {
  const age = petAge(pet, today);
  const years = age.years ? `${age.years} ${age.years === 1 ? 'year' : 'years'}` : '';
  const months =
    age.months || !age.years ? `${age.months} ${age.months === 1 ? 'month' : 'months'}` : '';
  return `${years}${years && months ? ', ' : ''}${months}`;
}

export function PetCard({ pet, today, onOpen }: { pet: Pet; today: string; onOpen: () => void }) {
  const plans = useQuery({
    queryKey: ownerQueryKey('meal-plans', pet.id),
    queryFn: () => getMealPlans(pet.id),
  });
  const species = pet.species === 'other' ? pet.otherSpecies : pet.species;
  const Icon = pet.species === 'dog' ? Dog : pet.species === 'cat' ? Cat : PawPrint;
  const accent =
    pet.species === 'dog'
      ? 'from-teal-700 to-emerald-400'
      : pet.species === 'cat'
        ? 'from-amber-600 to-orange-300'
        : 'from-violet-600 to-fuchsia-300';
  const active = plans.data?.[0];
  return (
    <article className="relative min-w-0 overflow-hidden rounded-[1.5rem] border border-[#e2eae6] bg-white p-5 shadow-[0_8px_28px_rgba(23,65,55,0.06)] sm:p-6">
      <div className={`absolute inset-x-0 top-0 h-1 bg-linear-to-r ${accent}`} />
      <div className="flex min-w-0 items-center gap-4">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-teal-50 text-teal-700">
          <Icon size={34} strokeWidth={1.7} aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <h2 className="break-words text-xl font-extrabold leading-tight text-[#183b35]">
            {pet.name}
          </h2>
          <p className="mt-1 break-words text-sm font-medium text-[#647b74]">
            {species}
            {pet.breed ? ` · ${pet.breed}` : ''}
          </p>
        </div>
      </div>
      <dl className="mt-6 grid grid-cols-2 gap-4 border-t border-[#edf1ee] pt-5">
        <div className="min-w-0">
          <dt className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-[#718881]">
            <CalendarDays size={14} aria-hidden="true" /> Age
          </dt>
          <dd className="mt-1.5 break-words text-sm font-bold text-[#203c37]">
            {ageLabel(pet, today)}
          </dd>
        </div>
        <div className="min-w-0">
          <dt className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-[#718881]">
            <Scale size={14} aria-hidden="true" /> {active ? 'Plan weight' : 'Weight'}
          </dt>
          <dd className="mt-1.5 text-sm font-bold text-[#203c37]">
            {active?.petWeightKg ?? pet.weightKg} kg
          </dd>
        </div>
      </dl>
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs font-semibold text-slate-500">
          {plans.isLoading
            ? 'Loading plan...'
            : active
              ? `${active.preview.dailyGrams} g/day planned`
              : 'No feeding plan yet'}
        </p>
        <button
          type="button"
          onClick={onOpen}
          className="rounded-xl bg-teal-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-teal-800 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-teal-700 focus-visible:ring-offset-2"
        >
          {active ? 'Open plan' : 'Plan meals'}
        </button>
      </div>
    </article>
  );
}
