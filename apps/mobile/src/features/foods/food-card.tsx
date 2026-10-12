import type { FoodCardProps } from './food-card-types';
import { useFoodPortion } from './use-food-portion';
import { FoodTile } from './food-tile';
import { FoodPopup } from './food-popup';

export function FoodCard(props: FoodCardProps) {
  const portion = useFoodPortion(props);
  return (
    <>
      <FoodTile props={props} portion={portion} />
      <FoodPopup props={props} portion={portion} />
    </>
  );
}
