import { describe, expect, it } from 'vitest';
import { catIngredientCatalog, catPackagedFoodCatalog } from '../src/cat-food-catalog.js';
import { savedFoodInputSchema } from '../src/foods.js';
import { foodKcalPerGram } from '../src/meal-intake.js';

const petId = '0123456789abcdef01234567';
const sourceRows = [
  ['05064', 'roasted', 118, 165, 31.02, 3.57, 0],
  ['05220', 'roasted', 938, 147, 30.13, 2.08, 0],
  ['01129', 'hard-boiled', 384, 155, 12.58, 10.61, 1.12],
  ['15016', 'dry-heat', 145, 105, 22.83, 0.86, 0],
  ['15237', 'dry-heat', 381, 206, 22.1, 12.35, 0],
  ['15271', 'cooked', 51, 99, 23.98, 0.28, 0.2],
] as const;

describe('feline ingredient source records', () => {
  it('preserves the verified USDA compositions and their preparation-specific locators', () => {
    expect(catIngredientCatalog).toHaveLength(sourceRows.length);
    sourceRows.forEach(([record, preparation, page, kcal, proteinG, fatG, carbsG], index) => {
      const item = catIngredientCatalog[index]!;
      expect(item.id).toMatch(
        new RegExp(`^cat\\.usda\\.sr(?:27|28)\\.${record}\\.${preparation}\\.v1$`),
      );
      expect(item.details.nutritionPer100g).toEqual({ kcal, proteinG, fatG, carbsG });
      expect(item.details.notes).toContain(`NDB ${record}`);
      expect(item.details.notes).toContain(`PDF page ${page} (first page = 1)`);
      expect(item.food.labelSource).toMatch(
        /^USDA SR composition estimate: https:\/\/www\.ars\.usda\.gov\//,
      );
      expect(item.food.labelCheckedOn).toBe('2026-10-12');
    });
  });

  it('keeps supplemental human-food estimates separate from feline label energy and adequacy', () => {
    for (const { food, details } of catIngredientCatalog) {
      expect(savedFoodInputSchema.safeParse({ petId, food, details }).success).toBe(true);
      expect(food).toMatchObject({
        species: 'cat',
        adequacy: 'supplemental',
        lifeStage: 'unknown',
        calories: null,
      });
      expect(details).toMatchObject({ kind: 'ingredient', category: 'protein' });
      expect(foodKcalPerGram(food)).toBeNull();
      expect(details.notes).toContain('human-food energy estimate, not verified feline ME');
      expect(details.notes).toContain('all extras together should stay within 10%');
      expect(details.notes).toContain('taurine and other unlisted nutrients are unknown');
      expect(details.notes).toContain('fully cooked');
    }
  });
});

describe('verified feline packaged label', () => {
  it('retains the US formulation, life-stage statement and independently stated mass energy', () => {
    expect(catPackagedFoodCatalog).toHaveLength(1);
    const { id, food, details } = catPackagedFoodCatalog[0]!;
    expect(id).toBe('cat.purina.us.e667222.classic-chicken-feast.v1');
    expect(savedFoodInputSchema.safeParse({ petId, food, details }).success).toBe(true);
    expect(food).toMatchObject({
      species: 'cat',
      form: 'wet',
      adequacy: 'complete',
      lifeStage: 'all',
      calorieBasis: 'kg',
      calories: 1080,
      packageGrams: null,
      labelCheckedOn: '2026-10-12',
    });
    expect(food.name).toContain('(US, 3 oz)');
    expect(food.labelSource).toContain(
      '6672-e667222-fancy-feast-classic-chicken-feast-cat-food.pdf',
    );
    expect(details.notes).toContain('US formula E667222');
    expect(details.notes).toContain('Formulated to meet AAFCO');
    expect(foodKcalPerGram(food)).toBe(1.08);
  });

  it('does not treat guaranteed minima as exact macros or invent carbohydrate and taurine totals', () => {
    const details = catPackagedFoodCatalog[0]!.details;
    expect(details.nutritionPer100g).toEqual({
      kcal: 108,
      proteinG: null,
      fatG: null,
      carbsG: null,
    });
    expect(details.notes).toContain('Guarantees are bounds, not exact macros');
    expect(details.notes).toContain('108 kcal/100 g is derived from the kg value');
    expect(Object.hasOwn(details.nutritionPer100g, 'taurineG')).toBe(false);
  });
});

describe('immutable feline built-ins', () => {
  it('prevents changing names, source records, composition or catalog membership', () => {
    expect(Object.isFrozen(catIngredientCatalog)).toBe(true);
    expect(Object.isFrozen(catPackagedFoodCatalog)).toBe(true);
    for (const item of [...catIngredientCatalog, ...catPackagedFoodCatalog]) {
      expect(Object.isFrozen(item)).toBe(true);
      expect(Object.isFrozen(item.food)).toBe(true);
      expect(Object.isFrozen(item.details)).toBe(true);
      expect(Object.isFrozen(item.details.nutritionPer100g)).toBe(true);
    }
    const item = catIngredientCatalog[0]!;
    expect(() => {
      item.food.name = 'Changed';
    }).toThrow(TypeError);
    expect(() => {
      item.details.nutritionPer100g.kcal = 1;
    }).toThrow(TypeError);
  });
});
