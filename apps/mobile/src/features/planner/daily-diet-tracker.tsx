import { ActivityIndicator, Text, View } from 'react-native';

import { Button, Card, ErrorMessage, colors } from '../../components/ui';
import { shortDate } from '../../components/presentation';

import { DietAssessmentForm } from './diet-assessment-form';

import { useDietTracker, type DailyDietTrackerProps } from './use-diet-tracker';
import { DailyTargetCard } from './daily-target-card';
import { styles } from './diet-tracker-styles';
export { DailyDietTable } from './daily-diet-table';
export function DailyDietTracker(props: DailyDietTrackerProps) {
  return <Tracker key={`${props.pet.id}:${props.pet.species}`} {...props} />;
}

function Tracker({
  pet,
  today,
  timeZone,
  plans,
  onFoods,
  onAssessmentEditingChange,
}: DailyDietTrackerProps) {
  const tracker = useDietTracker({
    pet,
    today,
    timeZone,
    plans,
    onFoods,
    onAssessmentEditingChange,
  });
  const {
    diary,
    assessment,
    save,
    remove,
    settingUp,
    setSettingUp,
    feeding,
    confirmed,
    feedingRows,
    loading,
    error,
  } = tracker;
  if (settingUp)
    return (
      <DietAssessmentForm
        pet={pet}
        today={today}
        assessment={confirmed}
        pending={save.isPending}
        error={save.error?.message}
        onCancel={() => {
          setSettingUp(false);
        }}
        onSave={(input) =>
          save.mutate(
            { petId: pet.id, ...input },
            {
              onSuccess: () => {
                setSettingUp(false);
              },
            },
          )
        }
      />
    );
  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <View style={styles.identity}>
          <Text accessibilityRole="header" style={styles.title}>
            Tracker
          </Text>
        </View>
        <Button label="Add food" variant="secondary" compact onPress={onFoods} />
      </View>
      {loading ? (
        <ActivityIndicator accessibilityLabel="Loading daily diet" color={colors.primary} />
      ) : error ? (
        <Card>
          <ErrorMessage message={error.message} />
          <Button
            label="Try again"
            variant="secondary"
            onPress={() => {
              void diary.refetch();
              void assessment.refetch();
              feeding.forEach((query) => void query.refetch());
            }}
          />
        </Card>
      ) : (
        <>
          <DailyTargetCard pet={pet} tracker={tracker} />
          <View style={styles.header}>
            <Text style={styles.sectionTitle}>Today's diet</Text>
            <Text style={styles.detail}>{shortDate(today)}</Text>
          </View>
          {(diary.data ?? []).length === 0 && <Text style={styles.detail}>No food recorded.</Text>}
          {(diary.data ?? []).map((entry) => (
            <Card key={entry.id}>
              <View style={styles.header}>
                <View style={styles.identity}>
                  <Text style={styles.foodName}>{entry.food.name}</Text>
                  <Text style={styles.detail}>
                    {entry.grams} g ·{' '}
                    {entry.nutrition.kcal === null
                      ? 'Unknown kcal'
                      : `${Math.round(entry.nutrition.kcal * 10) / 10} kcal`}
                  </Text>
                </View>
                <Button
                  label="Remove"
                  compact
                  variant="ghost"
                  accessibilityLabel={`Remove: ${entry.food.name}`}
                  disabled={remove.isPending}
                  onPress={() => remove.mutate(entry.id)}
                />
              </View>
            </Card>
          ))}
          {feedingRows.length > 0 && (
            <Text style={styles.detail}>Includes scheduled meals. Log each portion once.</Text>
          )}
          <ErrorMessage message={remove.error?.message} />
        </>
      )}
    </View>
  );
}
