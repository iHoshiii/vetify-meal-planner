import type { FormValues } from './pet-form-values';
import { reviewSections } from './pet-form-review-data';
export function PetReview({ form, onEdit }: { form: FormValues; onEdit: (index: number) => void }) {
  const sections = reviewSections(form);
  return (
    <div>
      <p className="mb-4 text-sm text-slate-600">Check these details before saving your pet.</p>
      <div className="grid gap-4 sm:grid-cols-2">
        {sections.map((section, index) => (
          <section key={section.title} className="rounded-xl border border-slate-200 p-4">
            <div className="flex items-start justify-between gap-3">
              <h4 className="font-bold text-slate-900">{section.title}</h4>
              <button
                type="button"
                aria-label={`Edit ${section.title}`}
                onClick={() => {
                  onEdit(index);
                }}
                className="text-sm font-bold text-teal-700 hover:text-teal-900"
              >
                Edit
              </button>
            </div>
            <dl className="mt-3 space-y-3">
              {section.fields.map(([label, value]) => (
                <div key={label}>
                  <dt className="text-xs text-slate-500">{label}</dt>
                  <dd className="mt-0.5 break-words text-sm font-semibold text-slate-900">
                    {value}
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        ))}
      </div>
    </div>
  );
}
