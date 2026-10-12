import type { FoodLabel } from '@vetify/planner-shared/foods';
import { Choice } from '../../components/ui';
import type { FoodFormState } from './use-food-form';
export function FoodSuitabilityFields({ state }: { state: FoodFormState }) {
  const { food, update } = state;
  return (
    <>
      <Choice<FoodLabel['species']>
        label="Made for"
        value={food.species}
        options={[
          { value: 'dog', label: 'Dogs' },
          { value: 'cat', label: 'Cats' },
          { value: 'other', label: 'Other' },
        ]}
        onChange={(species) => update({ species })}
      />
      <Choice<FoodLabel['adequacy']>
        label="Label says"
        value={food.adequacy}
        options={[
          { value: 'unknown', label: 'Not sure' },
          { value: 'complete', label: 'Complete and balanced' },
          { value: 'supplemental', label: 'Supplemental only' },
        ]}
        onChange={(adequacy) => update({ adequacy })}
      />
      <Choice<FoodLabel['lifeStage']>
        label="Life stage"
        value={food.lifeStage}
        options={[
          { value: 'unknown', label: 'Not sure' },
          { value: 'adult', label: 'Adult' },
          { value: 'growth', label: 'Growth' },
          { value: 'all', label: 'All stages' },
        ]}
        onChange={(lifeStage) => update({ lifeStage })}
      />
    </>
  );
}
