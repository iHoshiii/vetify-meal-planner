import { Text, View } from 'react-native';
import { Field } from '../../components/ui';
import type { FoodFormState } from './use-food-form';
import { styles } from './food-form-styles';
export function FoodNutrientFields({ state }: { state: FoodFormState }) {
  const { nutrition, updateNutrition } = state;
  return (
    <>
      <Text style={styles.hint}>Leave unknown values blank.</Text>
      <View style={styles.nutrientRow}>
        <View style={styles.nutrientField}>
          <Field
            label="Energy, kcal"
            value={nutrition.kcal}
            onChangeText={(value) => updateNutrition('kcal', value)}
            keyboardType="decimal-pad"
            placeholder="Unknown"
          />
        </View>
        <View style={styles.nutrientField}>
          <Field
            label="Protein, g"
            value={nutrition.proteinG}
            onChangeText={(value) => updateNutrition('proteinG', value)}
            keyboardType="decimal-pad"
            placeholder="Unknown"
          />
        </View>
      </View>
      <View style={styles.nutrientRow}>
        <View style={styles.nutrientField}>
          <Field
            label="Fat, g"
            value={nutrition.fatG}
            onChangeText={(value) => updateNutrition('fatG', value)}
            keyboardType="decimal-pad"
            placeholder="Unknown"
          />
        </View>
        <View style={styles.nutrientField}>
          <Field
            label="Carbs, g"
            value={nutrition.carbsG}
            onChangeText={(value) => updateNutrition('carbsG', value)}
            keyboardType="decimal-pad"
            placeholder="Unknown"
          />
        </View>
      </View>
      <Text style={styles.hint}>An ingredient is not a complete diet.</Text>
    </>
  );
}
