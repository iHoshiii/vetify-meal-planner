import type { Pet } from '@vetify/planner-shared/pets';

import { Linking, Pressable, Text, View } from 'react-native';

import { AppIcon } from '../../components/app-icon';
import { Button, Card } from '../../components/ui';
import { feedingMessage } from '../../components/presentation';

import type { DietTrackerState } from './use-diet-tracker';
import { DailyDietTable } from './daily-diet-table';
import { styles } from './diet-tracker-styles';
export function DailyTargetCard({ pet, tracker }: { pet: Pet; tracker: DietTrackerState }) {
  const { confirmed, save, setSettingUp, summary, targets, detailsOpen, setDetailsOpen } = tracker;
  return (
    <Card>
      <View style={styles.header}>
        <Text style={styles.sectionTitle}>Daily target</Text>
        {(pet.species === 'dog' || pet.species === 'cat') && (
          <Button
            label={confirmed ? 'Update' : 'Set target'}
            variant="ghost"
            compact
            onPress={() => {
              save.reset();
              setSettingUp(true);
            }}
          />
        )}
      </View>
      <DailyDietTable summary={summary} />
      {targets.status !== 'estimated' &&
        targets.blockers[0] !==
          'Confirm a current weight and feeding assessment to estimate daily targets.' && (
          <Text style={styles.detail}>
            {feedingMessage(targets.blockers[0] ?? 'Review the feeding plan.')}
          </Text>
        )}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Daily target details"
        accessibilityState={{ expanded: detailsOpen }}
        onPress={() => setDetailsOpen(!detailsOpen)}
        style={styles.detailsButton}
      >
        <Text style={styles.link}>Target details</Text>
        <AppIcon name="chevron-down" size={14} />
      </Pressable>
      {detailsOpen && (
        <View style={styles.screen}>
          {targets.status === 'estimated' && (
            <Text style={styles.detail}>
              Weight: {targets.weightKg} kg. Targets are starting estimates.
            </Text>
          )}
          {targets.blockers.map((blocker) => (
            <Text key={blocker} style={styles.detail}>
              {feedingMessage(blocker)}
            </Text>
          ))}
          <Text style={styles.detail}>
            Protein and fat are minimums. Carbs have no fixed target. Meeting these values does not
            confirm a complete diet.
          </Text>
          <View style={styles.header}>
            <Button
              label="AAHA"
              compact
              variant="ghost"
              onPress={() => void Linking.openURL(targets.sources.energy)}
            />
            <Button
              label="FEDIAF"
              compact
              variant="ghost"
              onPress={() => void Linking.openURL(targets.sources.nutrients)}
            />
          </View>
        </View>
      )}
    </Card>
  );
}
