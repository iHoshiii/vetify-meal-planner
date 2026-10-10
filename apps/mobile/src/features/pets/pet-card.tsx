import { StyleSheet, Text, View } from 'react-native';
import type { Pet } from '@vetify/planner-shared/pets';
import { petAge } from '@vetify/planner-shared/pet-age';
import { Button, Card, colors } from '../../components/ui';
import { AppIcon } from '../../components/app-icon';

type Props = {
  pet: Pet;
  today: string;
  pending?: boolean;
  onOpen: () => void;
  onEdit: () => void;
};

export function PetCard({ pet, today, pending, onOpen, onEdit }: Props) {
  const age = petAge(pet, today);
  const species = pet.species === 'other' ? pet.otherSpecies : pet.species;
  const ageLabel = [
    age.years ? `${age.years} yr` : '',
    age.months || !age.years ? `${age.months} mo` : '',
  ]
    .filter(Boolean)
    .join(' ');
  return (
    <Card>
      <View style={styles.header}>
        <View style={styles.avatar}>
          <AppIcon name="paw" size={22} color={colors.primary} />
        </View>
        <View style={styles.identity}>
          <Text style={styles.name} numberOfLines={1}>
            {pet.name}
          </Text>
          <Text style={styles.species} numberOfLines={1}>
            {[species, pet.breed].filter(Boolean).join(' · ')}
          </Text>
        </View>
      </View>
      <View style={styles.details}>
        <Text style={styles.detail}>{pet.weightKg} kg</Text>
        <Text style={styles.detail} accessibilityLabel={`${age.years} years, ${age.months} months`}>
          {ageLabel}
        </Text>
      </View>
      <View style={styles.actions}>
        <View style={styles.planAction}>
          <Button
            label="Meal plan"
            accessibilityLabel={`Open ${pet.name}'s meal plan`}
            disabled={pending}
            onPress={onOpen}
          />
        </View>
        <View style={styles.editAction}>
          <Button
            label="Edit"
            accessibilityLabel={`Edit ${pet.name}`}
            variant="secondary"
            disabled={pending}
            onPress={onEdit}
          />
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#edf7f5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  identity: { flex: 1, minWidth: 0, gap: 3 },
  name: { fontSize: 18, fontWeight: '600', color: colors.ink },
  species: { color: colors.muted, fontSize: 13, textTransform: 'capitalize' },
  details: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  detail: { color: colors.muted, fontSize: 13 },
  actions: { flexDirection: 'row', gap: 8 },
  planAction: { flex: 2, minWidth: 0 },
  editAction: { flex: 1, minWidth: 0 },
});
