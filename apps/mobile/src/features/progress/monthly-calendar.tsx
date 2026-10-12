import { Pressable, Text, View } from 'react-native';

import { Card, colors } from '../../components/ui';

import { styles } from './monthly-progress-styles';
import type { MonthlyProgress } from '@vetify/planner-shared/monthly-progress';
import { dayLabel } from './progress-day-details';
export function MonthlyCalendar({
  data,
  offset,
  selectedDate,
  setSelectedDate,
}: {
  data: MonthlyProgress;
  offset: number;
  selectedDate: string;
  setSelectedDate: (date: string) => void;
}) {
  return (
    <Card>
      <View style={styles.calendar}>
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((name) => (
          <Text key={name} style={styles.weekday}>
            {name}
          </Text>
        ))}
        {Array.from({ length: offset }, (_, index) => (
          <View key={`empty-${index}`} style={styles.cell} />
        ))}
        {data.days.map((day) => (
          <Pressable
            key={day.date}
            accessibilityRole="button"
            accessibilityLabel={dayLabel(day)}
            accessibilityState={{
              selected: selectedDate === day.date,
              disabled: day.status === 'future',
            }}
            disabled={day.status === 'future'}
            onPress={() => setSelectedDate(day.date)}
            style={styles.cell}
          >
            <View style={[styles.day, selectedDate === day.date && styles.selectedDay]}>
              <Text
                style={[
                  styles.dayNumber,
                  day.status === 'future' && styles.future,
                  selectedDate === day.date && styles.selectedNumber,
                ]}
              >
                {Number(day.date.slice(-2))}
              </Text>
              <View
                style={[
                  styles.dot,
                  {
                    backgroundColor:
                      day.status === 'recorded'
                        ? day.kcal === null
                          ? '#b7791f'
                          : colors.primary
                        : 'transparent',
                  },
                ]}
              />
            </View>
          </Pressable>
        ))}
      </View>
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.dot, { backgroundColor: colors.primary }]} />
          <Text style={styles.small}>Recorded</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.dot, { backgroundColor: '#b7791f' }]} />
          <Text style={styles.small}>Unknown kcal</Text>
        </View>
      </View>
    </Card>
  );
}
