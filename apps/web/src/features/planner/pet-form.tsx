import type { Pet, PetInput } from '@vetify/planner-shared/pets';
import { usePetForm, steps, reviewStep } from './use-pet-form';
import { PetReview } from './pet-review';
import { PetStep0 } from './pet-step-0';
import { PetStep1 } from './pet-step-1';
import { PetStep2 } from './pet-step-2';
import { PetStep3 } from './pet-step-3';
export function PetForm({
  pet,
  pending,
  serverError,
  onSave,
  onCancel,
}: {
  pet?: Pet;
  pending: boolean;
  serverError?: string;
  onSave: (input: PetInput) => void;
  onCancel: () => void;
}) {
  const state = usePetForm(pet, onSave);
  const { error, setError, step, setStep, returnToReview, setReturnToReview, next, submit } = state;

  return (
    <form
      onSubmit={submit}
      className="pet-form rounded-2xl border border-slate-200 bg-white p-5 shadow-xs sm:p-7"
    >
      <div className="mb-6 flex items-center justify-between gap-4">
        <h2 className="text-xl font-bold">{pet ? 'Edit pet' : 'Add Pet'}</h2>
        <button
          type="button"
          onClick={onCancel}
          className="text-sm font-bold text-slate-600 hover:text-slate-950"
        >
          Cancel
        </button>
      </div>
      <div className="mb-6">
        <p className="text-xs font-bold uppercase tracking-wide text-teal-700">
          Step {step + 1} of {steps.length}
        </p>
        <h3 className="mt-1 text-lg font-bold text-slate-900">{steps[step]}</h3>
        <ol aria-label="Pet form progress" className="mt-4 grid grid-cols-5 gap-2">
          {steps.map((name, index) => (
            <li
              key={name}
              aria-current={index === step ? 'step' : undefined}
              className={`h-1.5 rounded-full ${index <= step ? 'bg-teal-700' : 'bg-slate-200'}`}
            >
              <span className="sr-only">{name}</span>
            </li>
          ))}
        </ol>
      </div>
      {step === 0 && <PetStep0 {...state} />}
      {step === 1 && <PetStep1 {...state} />}
      {step === 2 && <PetStep2 {...state} />}
      {step === 3 && <PetStep3 {...state} />}
      {step === reviewStep && (
        <PetReview
          form={state.form}
          onEdit={(index) => {
            setError('');
            setReturnToReview(true);
            setStep(index);
          }}
        />
      )}
      {(error || serverError) && (
        <p role="alert" className="mt-5 text-sm font-semibold text-rose-700">
          {error || serverError}
        </p>
      )}
      <div className="mt-7 flex flex-wrap gap-3 border-t border-slate-100 pt-5">
        {step > 0 && (
          <button
            type="button"
            disabled={pending}
            onClick={() => {
              setError('');
              setReturnToReview(false);
              setStep((current) => current - 1);
            }}
            className="rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            Back
          </button>
        )}
        {step < reviewStep ? (
          <button
            key="next"
            type="button"
            onClick={(event) => {
              event.preventDefault();
              next(event.currentTarget.form);
            }}
            className="rounded-lg bg-teal-700 px-5 py-2.5 text-sm font-bold text-white hover:bg-teal-800"
          >
            {returnToReview ? 'Return to review' : 'Next'}
          </button>
        ) : (
          <button
            key="confirm"
            type="submit"
            disabled={pending}
            className="rounded-lg bg-teal-700 px-5 py-2.5 text-sm font-bold text-white hover:bg-teal-800 disabled:opacity-50"
          >
            {pending ? 'Saving...' : 'Confirm and save'}
          </button>
        )}
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg px-4 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-100"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
