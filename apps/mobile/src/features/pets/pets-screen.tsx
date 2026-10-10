import { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import type { Pet, PetInput } from '@vetify/planner-shared/pets';
import { Button, Card, ErrorMessage, colors } from '../../components/ui';
import { AppIcon } from '../../components/app-icon';
import { usePets, useCreatePet, useUpdatePet } from '../../services/pet-queries';
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
        <Text style={styles.title}>Pets</Text>
        {!!pets.data?.length && (
          <Button
            label="Add pet"
            variant="secondary"
            compact
            icon={<AppIcon name="plus" size={16} color={colors.primary} />}
            disabled={pending}
            onPress={() => openForm(null)}
          />
        )}
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
          <View style={styles.empty}>
            <View style={styles.emptyIcon}>
              <AppIcon name="paw" size={28} color={colors.primary} />
            </View>
            <Text style={styles.emptyTitle}>Add your first pet</Text>
            <Text style={styles.subtitle}>Set up their meals in a few steps.</Text>
            <View style={styles.emptyAction}>
              <Button
                label="Add pet"
                icon={<AppIcon name="plus" size={18} color={colors.white} />}
                disabled={pending}
                onPress={() => openForm(null)}
              />
            </View>
          </View>
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
  container: { gap: 14 },
  heading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  title: { color: colors.ink, fontSize: 23, fontWeight: '700', flex: 1 },
  subtitle: { color: colors.muted, fontSize: 14, lineHeight: 20, textAlign: 'center' },
  empty: { alignItems: 'center', paddingVertical: 24, gap: 10 },
  emptyIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#edf7f5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyTitle: { color: colors.ink, fontSize: 18, fontWeight: '600' },
  emptyAction: { alignSelf: 'stretch', marginTop: 8 },
});
