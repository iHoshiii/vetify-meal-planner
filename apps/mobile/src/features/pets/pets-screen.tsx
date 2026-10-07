import { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import type { Pet, PetInput } from '@vetify/planner-shared/pets';
import { Button, Card, ErrorMessage, colors } from '../../components/ui';
import { usePets, useCreatePet, useUpdatePet } from '../../services/pets.service';
import { PetCard } from './pet-card';
import { PetForm } from './pet-form';

export function PetsScreen({ today, onOpenPet }: { today: string; onOpenPet: (pet: Pet) => void }) {
  const pets = usePets();
  const create = useCreatePet();
  const update = useUpdatePet();
  const [editing, setEditing] = useState<Pet | null | undefined>(undefined);
  const pending = create.isPending || update.isPending;
  function openForm(pet: Pet | null) {
    create.reset();
    update.reset();
    setEditing(pet);
  }
  function save(input: PetInput) {
    const options = { onSuccess: () => setEditing(undefined) };
    if (editing) update.mutate({ id: editing.id, input }, options);
    else create.mutate(input, options);
  }
  if (editing !== undefined)
    return (
      <PetForm
        pet={editing ?? undefined}
        today={today}
        pending={pending}
        error={(editing ? update.error : create.error)?.message}
        onSave={save}
        onCancel={() => setEditing(undefined)}
      />
    );
  return (
    <View style={styles.container}>
      <View style={styles.heading}>
        <Text style={styles.title}>Your pets</Text>
        <Text style={styles.subtitle}>Plan portions and keep track of every meal.</Text>
        <Button label="Add a pet" disabled={pending} onPress={() => openForm(null)} />
      </View>
      {pets.isPending && (
        <ActivityIndicator accessibilityLabel="Loading pets" color={colors.primary} />
      )}
      {pets.isError && (
        <Card>
          <ErrorMessage message={pets.error.message} />
          <Button label="Try again" variant="secondary" onPress={() => void pets.refetch()} />
        </Card>
      )}
      {pets.data?.length === 0 && (
        <Card>
          <Text style={styles.emptyTitle}>Meet your meal planner</Text>
          <Text style={styles.subtitle}>
            Add a pet to set up a feeding schedule and daily calorie budget.
          </Text>
        </Card>
      )}
      {pets.data?.map((pet) => (
        <PetCard
          key={pet.id}
          pet={pet}
          today={today}
          pending={pending}
          onOpen={() => onOpenPet(pet)}
          onEdit={() => openForm(pet)}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 18 },
  heading: { gap: 12 },
  title: { color: colors.ink, fontSize: 29, fontWeight: '800' },
  subtitle: { color: colors.muted, fontSize: 15, lineHeight: 22 },
  emptyTitle: { color: colors.ink, fontSize: 19, fontWeight: '700', marginBottom: 8 },
});
