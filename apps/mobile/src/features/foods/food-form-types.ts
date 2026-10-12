import type { FoodDetails, FoodLabel } from '@vetify/planner-shared/foods';
import type { Pet } from '@vetify/planner-shared/pets';
export type FoodFormProps = {
  pet: Pet;
  food?: FoodLabel;
  details?: FoodDetails;
  editing?: boolean;
  pending: boolean;
  error?: string;
  onSave: (food: FoodLabel, details: FoodDetails) => void;
  onCancel: () => void;
};
