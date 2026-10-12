import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AppIcon } from '../../components/app-icon';
import { Field, colors } from '../../components/ui';

export function FoodSearchBar({
  search,
  onSearch,
  activeCount,
  onFilters,
}: {
  search: string;
  onSearch: (value: string) => void;
  activeCount: number;
  onFilters: () => void;
}) {
  return (
    <View style={styles.row}>
      <View style={styles.search}>
        <Field
          label="Search foods"
          value={search}
          onChangeText={onSearch}
          placeholder="Find a food"
          maxLength={120}
        />
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Filter and sort foods"
        accessibilityHint={
          activeCount ? `${activeCount} active options` : 'Choose category, meal type and sorting'
        }
        onPress={onFilters}
        style={[styles.button, activeCount > 0 && styles.active]}
      >
        <AppIcon name="filters" color={activeCount ? colors.white : colors.primary} />
        {activeCount > 0 && (
          <View style={styles.badge}>
            <Text style={styles.count}>{activeCount}</Text>
          </View>
        )}
      </Pressable>
    </View>
  );
}
const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-end', gap: 10 },
  search: { flex: 1, minWidth: 0 },
  button: {
    width: 44,
    height: 44,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    backgroundColor: colors.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  active: { backgroundColor: colors.primary, borderColor: colors.primary },
  badge: {
    position: 'absolute',
    top: -5,
    right: -5,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  count: { color: colors.white, fontSize: 10, fontWeight: '700' },
});
