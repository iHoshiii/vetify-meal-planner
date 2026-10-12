import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { defaultFoodDetails, type CatalogFood, type FoodLabel } from '@vetify/planner-shared/foods';
import type { Pet } from '@vetify/planner-shared/pets';
import { AppIcon } from '../../components/app-icon';
import { Button, Card, ErrorMessage, colors } from '../../components/ui';
import { activeFilterCount } from './food-browse';
import { FoodSearchBar } from './filters/food-filters';
import { FoodCard } from './cards/food-card';
import { sameFoodLabel } from './food-label';
import type { FoodBrowser } from './use-food-browser';

export function FoodLibrary({
  browser,
  pet,
  activeFood,
  today,
}: {
  browser: FoodBrowser;
  pet: Pet;
  activeFood?: FoodLabel;
  today: string;
}) {
  const {
    library,
    hasFoods,
    hasCurrent,
    foods,
    catalog,
    filteredFoods,
    filteredCatalog,
    openForm,
  } = browser;
  function group(title: string, items: CatalogFood[], saved: boolean) {
    if (!items.length) return null;
    return (
      <>
        <Text style={styles.sectionTitle}>{title}</Text>
        <View style={styles.grid}>
          {items.map((item) => (
            <FoodCard
              key={`${pet.id}:${today}:${item.id}`}
              pet={pet}
              food={item.food}
              details={item.details}
              today={today}
              current={saved && Boolean(activeFood && sameFoodLabel(item.food, activeFood))}
              entrySource={{ source: saved ? 'saved' : 'catalog', foodId: item.id }}
              onEdit={saved ? () => openForm(item.food, item.details, item.id) : undefined}
            />
          ))}
        </View>
      </>
    );
  }
  return (
    <>
      <View style={styles.heading}>
        <Text accessibilityRole="header" style={styles.title}>
          Foods
        </Text>
        {hasFoods && (
          <Button
            label="Add food"
            variant="secondary"
            compact
            icon={<AppIcon name="plus" size={16} />}
            onPress={() => openForm()}
          />
        )}
      </View>
      {library.isPending && (
        <ActivityIndicator color={colors.primary} accessibilityLabel="Loading foods" />
      )}
      {library.isError && (
        <Card>
          <ErrorMessage message={library.error.message} />
          <Button label="Try again" variant="secondary" onPress={() => void library.refetch()} />
        </Card>
      )}
      {!library.isPending && !library.isError && !hasFoods && (
        <Card>
          <View style={styles.empty}>
            <View style={styles.mark}>
              <AppIcon name="bowl" size={28} />
            </View>
            <Text style={styles.emptyTitle}>Add your pet's food</Text>
            <View style={styles.emptyAction}>
              <Button
                label="Add food"
                icon={<AppIcon name="plus" size={18} color={colors.white} />}
                onPress={() => openForm()}
              />
            </View>
          </View>
        </Card>
      )}
      {hasCurrent && activeFood && (
        <FoodCard
          key={`${pet.id}:${today}:current-food`}
          pet={pet}
          food={activeFood}
          details={defaultFoodDetails()}
          current
          wide
          today={today}
          onSaveLabel={() => openForm(activeFood, defaultFoodDetails())}
        />
      )}
      {(foods.length > 0 || catalog.length > 0) && (
        <FoodSearchBar
          search={browser.search}
          onSearch={browser.setSearch}
          activeCount={activeFilterCount(browser.filters)}
          onFilters={browser.openFilters}
        />
      )}
      {group('Your foods', filteredFoods, true)}
      {group('Food library', filteredCatalog, false)}
      {!library.isPending &&
        !library.isError &&
        (foods.length > 0 || catalog.length > 0) &&
        !filteredFoods.length &&
        !filteredCatalog.length && (
          <Text style={styles.detail}>No foods match. Try another name or filter.</Text>
        )}
    </>
  );
}
const styles = StyleSheet.create({
  heading: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { flex: 1, minWidth: 0, fontSize: 19, fontWeight: '700', color: colors.ink },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginTop: 4,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 14 },
  empty: { alignItems: 'center', paddingVertical: 20, gap: 10 },
  mark: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.soft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyTitle: { color: colors.ink, fontSize: 16, fontWeight: '600' },
  emptyAction: { alignSelf: 'stretch', marginTop: 8 },
  detail: { color: colors.muted, fontSize: 12, lineHeight: 18 },
});
