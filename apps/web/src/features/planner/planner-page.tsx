import { ownerQueryKey } from '@/auth/session';
import type { PetInput } from '@vetify/planner-shared/pets';
import { todayInTimeZone } from '@vetify/planner-shared/planner-date';
import { usePrincipal } from '@/auth/auth-boundary';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { PawPrint, Plus } from 'lucide-react';
import { useEffect, useState } from 'react';

import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { getMealPlans } from '@/services/meal-plans.service';
import { getPets, savePet } from '@/services/pets.service';

import { PetCard } from './pet-card';
import { PetForm } from './pet-form';
import { PlannerHeader } from './planner-header';
import { PlanView } from './plan-view';
import { PlanWizard } from './plan-wizard';

export default function PlannerPage() {
  useDocumentTitle('Meal planner', 'Plan and track meals for your pets.');
  const timeZone = usePrincipal()?.region.timeZone ?? 'Asia/Manila';
  const [today, setToday] = useState(() => todayInTimeZone(timeZone));
  useEffect(() => {
    const timer = window.setInterval(() => setToday(todayInTimeZone(timeZone)), 60_000);
    return () => window.clearInterval(timer);
  }, [timeZone]);
  const queryClient = useQueryClient();
  const pets = useQuery({ queryKey: ownerQueryKey('pets'), queryFn: getPets });
  const [formOpen, setFormOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [newPlan, setNewPlan] = useState(false);
  const selectedPet = pets.data?.find((pet) => pet.id === selectedId);
  const plans = useQuery({
    queryKey: ownerQueryKey('meal-plans', selectedId),
    queryFn: () => getMealPlans(selectedId!),
    enabled: Boolean(selectedId),
  });
  const activePlan = plans.data?.[0];
  const mutation = useMutation({
    mutationFn: (input: PetInput) => savePet(input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ownerQueryKey('pets') });
      setFormOpen(false);
    },
  });

  function openForm() {
    mutation.reset();
    setFormOpen(true);
  }

  return (
    <main className="min-h-screen bg-[#f7faf8] px-4 py-8 text-slate-950 sm:px-8 sm:py-12">
      <div className="mx-auto max-w-5xl">
        <PlannerHeader
          count={pets.data?.length}
          showAdd={!formOpen && !selectedId}
          onAdd={openForm}
        />

        {pets.isLoading && <p className="text-sm text-slate-600">Loading your pets...</p>}
        {pets.isError && (
          <div className="rounded-xl border border-rose-200 bg-white p-5 text-sm text-rose-800">
            Your pets could not be loaded.{' '}
            <button
              type="button"
              onClick={() => void pets.refetch()}
              className="font-bold underline"
            >
              Try again
            </button>
          </div>
        )}

        {formOpen && (
          <PetForm
            pending={mutation.isPending}
            serverError={mutation.error?.message}
            onSave={(input) => mutation.mutate(input)}
            onCancel={() => setFormOpen(false)}
          />
        )}

        {selectedPet && !formOpen && (
          <>
            {plans.isLoading && <p className="text-sm text-slate-600">Loading the meal plan...</p>}
            {plans.isError && (
              <p role="alert" className="rounded-xl bg-rose-50 p-4 text-sm text-rose-800">
                The meal plan could not be loaded.
              </p>
            )}
            {!plans.isLoading &&
              !plans.isError &&
              (newPlan || !activePlan ? (
                <PlanWizard
                  key={`${selectedPet.id}-${activePlan?.version ?? 0}`}
                  pet={selectedPet}
                  existingPlan={activePlan}
                  onCancel={() => (activePlan ? setNewPlan(false) : setSelectedId(null))}
                  onSaved={() => {
                    setNewPlan(false);
                    void queryClient.invalidateQueries({
                      queryKey: ownerQueryKey('meal-plans', selectedPet.id),
                    });
                  }}
                />
              ) : (
                <PlanView
                  plan={activePlan}
                  history={plans.data ?? []}
                  onReview={() => setNewPlan(true)}
                  onBack={() => setSelectedId(null)}
                />
              ))}
          </>
        )}

        {pets.data &&
          !formOpen &&
          !selectedPet &&
          (pets.data.length ? (
            <div className="grid gap-5 sm:grid-cols-2">
              {pets.data.map((pet) => (
                <PetCard
                  key={pet.id}
                  pet={pet}
                  today={today}
                  onOpen={() => {
                    setSelectedId(pet.id);
                    setNewPlan(false);
                  }}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-[1.5rem] border border-[#e2eae6] bg-white px-6 py-12 text-center shadow-xs">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#e7f5ef] text-[#176c60]">
                <PawPrint size={34} strokeWidth={1.7} aria-hidden="true" />
              </div>
              <h2 className="mt-5 text-xl font-bold text-[#183b35]">No pets added yet</h2>
              <p className="mt-2 text-sm text-slate-600">
                Start with your pet&apos;s basic details.
              </p>
              <button
                type="button"
                onClick={openForm}
                className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#176f62] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#11594f]"
              >
                <Plus size={18} strokeWidth={2.5} aria-hidden="true" /> Add Pet
              </button>
            </div>
          ))}
      </div>
    </main>
  );
}
