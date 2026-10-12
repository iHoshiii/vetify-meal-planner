import { Text, View } from 'react-native';
import type { portionNutrition } from '@vetify/planner-shared/daily-diet';
import { nutritionText } from './food-label';
import { styles } from './food-card-styles';

export function FoodNutrition({
  nutrition,
  per100 = false,
}: {
  nutrition: ReturnType<typeof portionNutrition>;
  per100?: boolean;
}) {
  return (
    <>
      <Text style={styles.calories}>
        {nutritionText(
          nutrition.kcal === null ? null : Math.round(nutrition.kcal * 10) / 10,
          ' kcal',
        )}
        {per100 ? ' / 100 g' : ''}
      </Text>
      <View style={styles.macroRow}>
        {(
          [
            ['Protein', nutrition.proteinG],
            ['Fat', nutrition.fatG],
            ['Carbs', nutrition.carbsG],
          ] as const
        ).map(([label, value]) => (
          <View key={label} style={styles.macro}>
            <Text style={styles.macroLabel}>{label}</Text>
            <Text style={styles.macroValue}>
              {nutritionText(value === null ? null : Math.round(value * 10) / 10, ' g')}
            </Text>
          </View>
        ))}
      </View>
    </>
  );
}
