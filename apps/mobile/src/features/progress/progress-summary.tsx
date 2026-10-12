import { Text, View } from 'react-native';

import { Card } from '../../components/ui';

import { styles } from './monthly-progress-styles';
import type { MonthlyProgress } from '@vetify/planner-shared/monthly-progress';
import { dateLabel } from './progress-day-details';
export function ProgressStats({ data }: { data: MonthlyProgress }) {
  return (
    <>
      <View style={styles.stats}>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{data.summary.recordedDays}</Text>
          <Text style={styles.detail}>Days recorded</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statValue}>
            {data.summary.knownLoggedKcal === null
              ? 'N/A'
              : Math.round(data.summary.knownLoggedKcal)}
          </Text>
          <Text style={styles.detail}>Recorded calories</Text>
        </View>
      </View>
      {data.summary.unknownCalorieDays > 0 && (
        <Text style={styles.detail}>
          {data.summary.unknownCalorieDays} recorded{' '}
          {data.summary.unknownCalorieDays === 1 ? 'day has' : 'days have'} unknown calories.
        </Text>
      )}
    </>
  );
}
export function ProgressMeasurements({ data }: { data: MonthlyProgress }) {
  return (
    <Card>
      <Text style={styles.sectionTitle}>Measurements</Text>
      {data.measurements.length === 0 ? (
        <Text style={styles.detail}>No measurements recorded this month.</Text>
      ) : (
        data.measurements.map((item) => (
          <View key={item.id} style={styles.measurement}>
            <Text style={styles.detail}>
              {dateLabel(item.measuredOn, { month: 'short', day: 'numeric' })}
            </Text>
            <Text style={styles.label}>
              {item.weightKg} kg
              {item.conditionScore === null ? '' : ` · Condition ${item.conditionScore}/9`}
            </Text>
          </View>
        ))
      )}
    </Card>
  );
}
