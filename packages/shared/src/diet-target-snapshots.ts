import type { DailyDietTargets } from './daily-diet.js';

/** Frozen reference for a civil date, captured when an assessment was confirmed. */
export type DietTargetSnapshot = {
  revisionId: string;
  petId: string;
  date: string;
  timeZone: string;
  validFrom: string;
  validThrough: string;
  recordedAt: string;
  expired?: boolean;
  targets: DailyDietTargets;
};
