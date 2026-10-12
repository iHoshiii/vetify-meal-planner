import { type DailyDietSummary } from '@vetify/planner-shared/daily-diet';

import { Text, View } from 'react-native';

import { styles } from './diet-tracker-styles';
export function DailyDietTable({ summary }: { summary: DailyDietSummary }) {
  const display = (value: number | null) =>
    value === null ? 'N/A' : String(Math.round(value * 10) / 10);
  return (
    <View style={styles.table}>
      <View style={styles.tableRow}>
        <Text style={styles.nutrient}></Text>
        {['Target', 'Added', 'Remaining'].map((title) => (
          <Text key={title} style={styles.tableHeading}>
            {title}
          </Text>
        ))}
      </View>
      {(
        [
          ['kcal', 'Calories', 'kcal'],
          ['proteinG', 'Protein min.', 'g'],
          ['fatG', 'Fat min.', 'g'],
          ['carbsG', 'Carbs', 'g'],
        ] as const
      ).map(([key, label, unit]) => {
        const row = summary[key];
        const added = row.total === null ? 'Unknown' : display(row.total);
        const remaining =
          row.remaining !== null && row.remaining < 0
            ? `${display(-row.remaining)} over`
            : display(row.remaining);
        return (
          <View
            key={key}
            style={styles.tableRow}
            accessibilityLabel={`${label}: target ${display(row.target)} ${unit}, added ${added} ${unit}, remaining ${remaining} ${unit}`}
          >
            <View style={styles.nutrient}>
              <Text style={styles.nutrientName}>{label}</Text>
              <Text style={styles.unit}>{unit}</Text>
            </View>
            <Text style={styles.tableValue}>{display(row.target)}</Text>
            <Text style={styles.tableValue}>{added}</Text>
            <Text style={[styles.tableValue, styles.remaining]}>{remaining}</Text>
          </View>
        );
      })}
    </View>
  );
}
