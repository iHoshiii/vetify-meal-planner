import { Image, Pressable, Text, View } from 'react-native';
import { portionNutrition } from '@vetify/planner-shared/daily-diet';
import { AppIcon } from '../../components/app-icon';
import { Button, Card, colors } from '../../components/ui';
import { foodCategories, foodMatchesPet } from './food-label';
import type { FoodCardProps } from './food-card-types';
import type { FoodPortion } from './use-food-portion';
import { styles } from './food-card-styles';

export function FoodTile({ props, portion }: { props: FoodCardProps; portion: FoodPortion }) {
  const { food, details, pet, current, wide, entrySource, onSaveLabel } = props;
  const { added, add, toggle } = portion;
  const matches = foodMatchesPet(food, pet);
  const per100 = portionNutrition(food, details, 100);
  const subtitle =
    details.kind === 'ingredient'
      ? (foodCategories.find((item) => item.value === details.category)?.label ?? 'Ingredient')
      : `${food.form === 'dry' ? 'Dry' : food.form === 'wet' ? 'Wet' : 'Other'} · ${food.species === 'dog' ? 'Dogs' : food.species === 'cat' ? 'Cats' : 'Other species'}`;
  if (wide)
    return (
      <Card>
        <View style={styles.wideRow}>
          <View style={styles.identity}>
            {current && <Text style={styles.current}>Current plan</Text>}
            <Text style={styles.foodName}>{food.name}</Text>
            <Text style={styles.detail}>{subtitle}</Text>
          </View>
          <View style={styles.wideActions}>
            {onSaveLabel && (
              <Button
                label="Save"
                compact
                variant="secondary"
                accessibilityLabel={`Save label: ${food.name}`}
                onPress={onSaveLabel}
              />
            )}
            <Button
              label="View"
              compact
              variant="secondary"
              accessibilityLabel={`View: ${food.name}`}
              onPress={() => toggle('view')}
            />
          </View>
        </View>
        {added && (
          <Text accessibilityLiveRegion="polite" style={styles.current}>
            Added to today's diet
          </Text>
        )}
        {!matches && <Text style={styles.mismatch}>Different species from {pet.name}</Text>}
      </Card>
    );
  return (
    <View style={styles.tile}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`View: ${food.name}`}
        disabled={add.isPending}
        onPress={() => toggle('view')}
      >
        <View style={styles.image}>
          {details.imageUrl ? (
            <Image
              source={{ uri: details.imageUrl }}
              style={styles.photo}
              resizeMode="cover"
              accessibilityIgnoresInvertColors
            />
          ) : (
            <View style={styles.placeholder}>
              <AppIcon name="bowl" size={28} />
            </View>
          )}
          {per100.kcal !== null && (
            <View style={styles.kcalBadge}>
              <Text style={styles.kcalBadgeText}>{Math.round(per100.kcal)} kcal</Text>
            </View>
          )}
        </View>
        <View style={styles.info}>
          {current && <Text style={styles.current}>Current plan</Text>}
          <Text style={styles.foodName} numberOfLines={2}>
            {food.name}
          </Text>
          <Text style={styles.detail} numberOfLines={1}>
            {subtitle}
          </Text>
          {!matches && <Text style={styles.mismatch}>Different species from {pet.name}</Text>}
          {added && (
            <Text accessibilityLiveRegion="polite" style={styles.current}>
              Added to today's diet
            </Text>
          )}
        </View>
      </Pressable>
      {entrySource && (
        <Pressable
          style={({ pressed }) => [
            styles.fab,
            (pressed || add.isPending || !matches) && { opacity: 0.5 },
          ]}
          accessibilityRole="button"
          accessibilityLabel={`Add: ${food.name}`}
          disabled={add.isPending || !matches}
          onPress={() => toggle('add')}
        >
          <AppIcon name="plus" size={18} color={colors.white} />
        </Pressable>
      )}
    </View>
  );
}
