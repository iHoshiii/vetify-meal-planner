import { StyleSheet, Text, View } from 'react-native';
import type { Pet } from '@vetify/planner-shared/pets';
import { petAge } from '@vetify/planner-shared/pet-age';
import { Button, Card, colors } from '../../components/ui';

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
  return (
    <Card>
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.initial}>{pet.name.slice(0, 1).toUpperCase()}</Text>
        </View>
        <View style={styles.identity}>
          <Text style={styles.name}>{pet.name}</Text>
          <Text style={styles.species}>{[species, pet.breed].filter(Boolean).join(' · ')}</Text>
        </View>
      </View>
      <View style={styles.details}>
        <Text style={styles.detail}>{pet.weightKg} kg</Text>
        <Text style={styles.detail}>
          {age.years} years, {age.months} months
        </Text>
      </View>
      {pet.currentFood ? <Text style={styles.food}>Current food: {pet.currentFood}</Text> : null}
      <View style={styles.actions}>
        <Button label={`Open ${pet.name}'s meal planner`} disabled={pending} onPress={onOpen} />
        <Button label="Edit pet" variant="secondary" disabled={pending} onPress={onEdit} />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  avatar: {
    width: 54,
    height: 54,
    borderRadius: 16,
    backgroundColor: '#e9f6f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  initial: { fontSize: 25, fontWeight: '800', color: colors.primary },
  identity: { flex: 1, gap: 4 },
  name: { fontSize: 21, fontWeight: '800', color: colors.ink },
  species: { color: colors.muted, fontSize: 14, textTransform: 'capitalize' },
  details: { flexDirection: 'row', flexWrap: 'wrap', gap: 18, marginVertical: 16 },
  detail: { color: colors.ink, fontSize: 14 },
  food: { color: colors.muted, fontSize: 13, marginBottom: 16 },
  actions: { gap: 10 },
});
