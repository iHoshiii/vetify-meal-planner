import { expect, it } from 'vitest';
import { assertRestrictedPrivileges, assertPlannerNamespace } from '../config/database-access.js';

it('accepts data/index privileges confined to the dedicated planner database', () => {
  expect(() =>
    assertRestrictedPrivileges('vetify_meal_planner', [
      {
        resource: { db: 'vetify_meal_planner' },
        actions: ['find', 'insert', 'update', 'createIndex'],
      },
    ]),
  ).not.toThrow();
});
it.each([
  { privileges: [{ resource: { db: '' }, actions: ['find', 'insert'] }] },
  { privileges: [{ resource: { db: 'Vetify' }, actions: ['find'] }] },
  { privileges: [{ resource: { anyResource: true }, actions: ['find'] }] },
  { privileges: [] },
])('rejects credentials with main-database, wildcard or unverifiable access', ({ privileges }) => {
  expect(() => assertRestrictedPrivileges('vetify_meal_planner', privileges)).toThrow('restricted');
});
it('rejects implicit Mongo namespaces and the main Vetify database', () => {
  expect(() => assertPlannerNamespace('mongodb://127.0.0.1:27017')).toThrow('namespace');
  expect(() => assertPlannerNamespace('mongodb://127.0.0.1:27017/Vetify')).toThrow('namespace');
  expect(() =>
    assertPlannerNamespace('mongodb://127.0.0.1:27018/vetify_meal_planner'),
  ).not.toThrow();
});
