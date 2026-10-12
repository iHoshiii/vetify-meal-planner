import { Text } from 'react-native';
import type { FoodDetails, FoodLabel } from '@vetify/planner-shared/foods';
import { Choice, Field } from '../../components/ui';
import { FoodCategoryChoice } from './food-category-choice';
import { foodCategories } from './food-label';
import type { FoodFormState } from './use-food-form';
import { styles } from './food-form-styles';
import type { FoodFormProps } from './food-form-types';
export function FoodIdentityFields({
  state,
  editing,
}: {
  state: FoodFormState;
  editing: FoodFormProps['editing'];
}) {
  const { details, food, isIngredient, changeKind, update, updateDetails } = state;
  return (
    <>
      {!editing ? (
        <Choice<FoodDetails['kind']>
          label="Food type"
          value={details.kind}
          options={[
            { value: 'ingredient', label: 'Ingredient' },
            { value: 'packaged', label: 'Packaged food' },
          ]}
          onChange={changeKind}
        />
      ) : (
        <Text style={styles.hint}>{isIngredient ? 'Ingredient' : 'Packaged food'}</Text>
      )}
      <Field
        label="Food name"
        value={food.name}
        onChangeText={(name) => update({ name })}
        maxLength={120}
        placeholder={isIngredient ? 'e.g. Plain cooked chicken' : 'Name on the package'}
      />
      {isIngredient ? (
        <FoodCategoryChoice
          label="Category"
          value={details.category ?? 'unknown'}
          options={[{ value: 'unknown', label: 'Not sure' }, ...foodCategories]}
          onChange={(category) =>
            updateDetails({ category: category === 'unknown' ? null : category })
          }
        />
      ) : (
        <Choice<FoodLabel['form']>
          label="Food form"
          value={food.form}
          options={[
            { value: 'dry', label: 'Dry' },
            { value: 'wet', label: 'Wet' },
            { value: 'other', label: 'Other' },
          ]}
          onChange={(form) => update({ form })}
        />
      )}
    </>
  );
}
