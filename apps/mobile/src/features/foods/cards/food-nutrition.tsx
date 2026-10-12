import { Text, View, StyleSheet } from 'react-native';
import type { portionNutrition } from '@vetify/planner-shared/daily-diet';
import { nutritionText } from '../food-label';
import { colors } from '../../../components/ui';

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

export const styles = StyleSheet.create({
  detail: { color: colors.muted, fontSize: 12, lineHeight: 18 },
  tile: {
    width: '48%',
    backgroundColor: colors.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  image: {
    height: 112,
    backgroundColor: colors.soft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photo: { width: '100%', height: '100%' },
  placeholder: { alignItems: 'center', justifyContent: 'center' },
  kcalBadge: {
    position: 'absolute',
    left: 8,
    bottom: 8,
    backgroundColor: 'rgba(15, 23, 42, 0.72)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  kcalBadgeText: { color: colors.white, fontSize: 11, fontWeight: '700' },
  fab: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: { padding: 10, gap: 3 },
  identity: { flex: 1, minWidth: 0, gap: 3 },
  wideRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  wideActions: { width: 76, gap: 6 },
  foodName: { color: colors.ink, fontSize: 15, fontWeight: '600' },
  current: { color: colors.primary, fontSize: 11, fontWeight: '700' },
  calories: { color: colors.ink, fontSize: 15, fontWeight: '600' },
  mismatch: { color: '#9a6700', fontSize: 12 },
  macroRow: { flexDirection: 'row', gap: 8 },
  macro: { flex: 1, minWidth: 0, gap: 4 },
  macroLabel: { color: colors.muted, fontSize: 12 },
  macroValue: { color: colors.ink, fontSize: 14, fontWeight: '600' },
});
