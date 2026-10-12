// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, expect, it, vi } from 'vitest';

const api = vi.hoisted(() => ({ assessment: vi.fn() }));
vi.mock('../auth/session', () => ({ ownerQueryKey: (...parts: unknown[]) => ['owner', ...parts] }));
vi.mock('./diet.service', () => ({
  getDietAssessment: api.assessment,
  getDietEntries: vi.fn(),
  addDietEntry: vi.fn(),
  removeDietEntry: vi.fn(),
  saveDietAssessment: vi.fn(),
}));
import { useDietAssessment } from './diet-queries';

let client: QueryClient;
afterEach(() => {
  cleanup();
  client?.clear();
  vi.clearAllMocks();
});

function Probe({ updatedAt, timeZone }: { updatedAt: string; timeZone: string }) {
  const query = useDietAssessment('cat-1', '2026-10-12', updatedAt, timeZone);
  return createElement(
    'span',
    null,
    query.isPending ? 'Loading' : query.data ? 'Assessment current' : 'Reassessment needed',
  );
}

function tree(updatedAt: string, timeZone: string) {
  return createElement(
    QueryClientProvider,
    { client },
    createElement(Probe, { updatedAt, timeZone }),
  );
}

function begin() {
  // A previously loaded assessment stays cached indefinitely unless context
  // changes. These checks catch stale evidence without relying on a refetch timer.
  client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } });
  api.assessment.mockResolvedValueOnce({
    weightKg: 4,
    weightMeasuredOn: '2026-10-12',
    conditionScore: 5,
    stableWeight: true,
    growing: false,
    healthConcern: false,
    prescribedDiet: false,
    appetiteChange: false,
    muscleCondition: 'normal',
  });
}

it('requests current server evidence when timezone changes on the same civil date', async () => {
  begin();
  const view = render(tree('2026-10-12T00:00:00Z', 'Asia/Manila'));
  await screen.findByText('Assessment current');
  api.assessment.mockResolvedValueOnce(null);
  view.rerender(tree('2026-10-12T00:00:00Z', 'Pacific/Honolulu'));
  await screen.findByText('Reassessment needed');
  expect(api.assessment).toHaveBeenCalledTimes(2);
});

it('requests new evidence after a profile edit instead of reusing cached normal muscle', async () => {
  begin();
  const view = render(tree('2026-10-12T00:00:00Z', 'Asia/Manila'));
  await screen.findByText('Assessment current');
  api.assessment.mockResolvedValueOnce(null);
  view.rerender(tree('2026-10-12T01:00:00Z', 'Asia/Manila'));
  await screen.findByText('Reassessment needed');
  expect(api.assessment).toHaveBeenCalledTimes(2);
});
