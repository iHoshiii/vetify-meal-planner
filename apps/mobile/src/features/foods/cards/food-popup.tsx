import { Text } from 'react-native';
import { Button, ErrorMessage, Field, Popup } from '../../../components/ui';
import { foodNotesText } from '../../../components/presentation';
import { foodCalories } from '../food-label';
import { mealTypes } from '../food-browse';
import { FoodNutrition } from './food-nutrition';
import type { FoodCardProps } from './food-card';
import type { FoodPortion } from './use-food-portion';
import { styles } from './food-nutrition';

export function FoodPopup({ props, portion }: { props: FoodCardProps; portion: FoodPortion }) {
  const { food, details, today, entrySource, onEdit } = props;
  const { open, setOpen, grams, amount, validAmount, nutrition, add, addPortion } = portion;
  const ingredient = details.kind === 'ingredient';
  return (
    <Popup visible={open !== null} title={food.name} onClose={() => setOpen(null)}>
      {open === 'add' ? (
        <>
          <Field
            label="Amount, g"
            value={grams}
            keyboardType="decimal-pad"
            maxLength={12}
            onChangeText={amount}
            placeholder="e.g. 50"
          />
          {validAmount && <FoodNutrition nutrition={nutrition} />}
          <Text style={styles.detail}>Today's diet · {today}</Text>
          <ErrorMessage message={add.error?.message} />
          <Button
            label={add.isPending ? 'Adding...' : 'Add to diet'}
            disabled={add.isPending || !validAmount}
            onPress={addPortion}
          />
        </>
      ) : (
        <>
          <Text style={styles.macroLabel}>Per 100 g{ingredient ? ' (estimated)' : ''}</Text>
          <FoodNutrition nutrition={nutrition} per100 />
          {!ingredient && <Text style={styles.detail}>{foodCalories(food)}</Text>}
          <Text style={styles.detail}>
            {ingredient
              ? 'Supplemental food'
              : food.adequacy === 'complete'
                ? 'Complete food (label)'
                : 'Completeness not confirmed'}
          </Text>
          {Boolean(details.mealTypes?.length) && (
            <Text style={styles.detail}>
              {mealTypes
                .filter(({ value }) => details.mealTypes?.includes(value))
                .map(({ label }) => label)
                .join(', ')}
            </Text>
          )}
          {details.notes && (
            <Text style={styles.detail}>
              {foodNotesText(details.notes, entrySource?.source === 'catalog')}
            </Text>
          )}
          {onEdit && (
            <Button
              label="Edit food"
              variant="ghost"
              compact
              accessibilityLabel={`Edit: ${food.name}`}
              onPress={onEdit}
            />
          )}
        </>
      )}
    </Popup>
  );
}
