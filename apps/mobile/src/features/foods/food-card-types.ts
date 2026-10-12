import type { FoodDetails, FoodLabel } from '@vetify/planner-shared/foods';
import type { Pet } from '@vetify/planner-shared/pets';
import type { DietEntryInput } from '@vetify/planner-shared/daily-diet';

export type FoodCardProps = {
  pet: Pet;
  food: FoodLabel;
  details: FoodDetails;
  current?: boolean;
  wide?: boolean;
  today: string;
  entrySource?: Pick<DietEntryInput, 'source' | 'foodId'>;
  onEdit?: () => void;
  onSaveLabel?: () => void;
};
