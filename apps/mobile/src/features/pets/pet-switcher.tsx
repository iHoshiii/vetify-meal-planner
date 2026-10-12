import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import type { Pet } from '@vetify/planner-shared/pets';
import { AppIcon } from '../../components/app-icon';
import { Button, colors, ErrorMessage } from '../../components/ui';

export function PetSwitcher({
  visible,
  pets,
  selectedId,
  loading,
  error,
  onSelect,
  onManagePets,
  onClose,
  onRetry,
}: {
  visible: boolean;
  pets: Pet[];
  selectedId?: string;
  loading: boolean;
  error?: string;
  onSelect: (pet: Pet) => void;
  onManagePets: () => void;
  onClose: () => void;
  onRetry: () => void;
}) {
  const { height } = useWindowDimensions();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable
          style={StyleSheet.absoluteFill}
          accessibilityLabel="Close pet switcher"
          accessibilityRole="button"
          onPress={onClose}
        />
        <View
          style={[styles.sheet, { maxHeight: height * 0.75 }]}
          accessibilityViewIsModal
          onAccessibilityEscape={onClose}
        >
          <View style={styles.heading}>
            <Text accessibilityRole="header" style={styles.title}>
              Switch pet
            </Text>
            <Button label="Done" variant="ghost" compact onPress={onClose} />
          </View>
          {loading && (
            <ActivityIndicator color={colors.primary} accessibilityLabel="Loading pets" />
          )}
          <ErrorMessage message={error} />
          {error && <Button label="Try again" variant="secondary" onPress={onRetry} />}
          <ScrollView accessibilityRole="radiogroup" keyboardShouldPersistTaps="handled">
            {pets.map((pet) => (
              <Pressable
                key={pet.id}
                accessibilityRole="radio"
                accessibilityLabel={pet.name}
                accessibilityState={{ checked: pet.id === selectedId }}
                onPress={() => onSelect(pet)}
                style={({ pressed }) => [
                  styles.pet,
                  pet.id === selectedId && styles.selected,
                  pressed && { opacity: 0.6 },
                ]}
              >
                <View style={styles.avatar}>
                  <AppIcon name="paw" />
                </View>
                <View style={styles.identity}>
                  <Text style={styles.name}>{pet.name}</Text>
                  <Text style={styles.detail}>
                    {[pet.species === 'other' ? pet.otherSpecies : pet.species, pet.breed]
                      .filter(Boolean)
                      .join(' · ')}
                  </Text>
                </View>
                {pet.id === selectedId && <AppIcon name="check" size={18} />}
              </Pressable>
            ))}
          </ScrollView>
          {!loading && !error && pets.length === 0 && (
            <Text style={styles.empty}>Add your first pet to get started.</Text>
          )}
          <Button
            label="Add or edit pets"
            variant="secondary"
            icon={<AppIcon name="plus" size={16} />}
            onPress={onManagePets}
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(15, 23, 42, 0.35)' },
  sheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 36,
    gap: 14,
  },
  heading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  title: { color: colors.ink, fontSize: 21, fontWeight: '600' },
  pet: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 12,
    marginBottom: 6,
  },
  selected: { backgroundColor: colors.soft },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.soft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  identity: { flex: 1, minWidth: 0, gap: 3 },
  name: { color: colors.ink, fontSize: 16, fontWeight: '600' },
  detail: { color: colors.muted, fontSize: 12, textTransform: 'capitalize' },
  empty: { color: colors.muted, fontSize: 14, paddingVertical: 12 },
});
