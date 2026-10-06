import { act, cleanup, render, screen } from '@testing-library/react';
import { useQuery } from '@tanstack/react-query';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AuthBoundary } from '@/auth/auth-boundary';
import { writeSession } from '@/auth/session';
import { apiFetch } from '@/services/api';

const principal = {
  version: 1,
  user: { id: 'owner', role: 'user', status: 'active' },
  region: { timeZone: 'Asia/Manila' },
  subscription: { plan: 'free', status: null, expiresAt: null },
  entitlements: [],
  tokenExpiresAt: '2099-01-01T00:00:00.000Z',
  validUntil: '2099-01-01T00:00:00.000Z',
};
describe('authenticated bootstrap', () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    writeSession(null);
  });
  it('waits for bootstrap on a fresh origin before rendering planner', async () => {
    writeSession(null);
    const fetcher = vi.fn(
      async (url: string) =>
        new Response(
          JSON.stringify(
            url.includes('/auth/refresh')
              ? {
                  accessToken: 'token',
                  user: { id: 'owner', name: 'Owner', email: 'owner@example.test', role: 'user' },
                }
              : principal,
          ),
          { status: 200 },
        ),
    );
    vi.stubGlobal('fetch', fetcher);
    render(
      <AuthBoundary>
        <p>Planner ready</p>
      </AuthBoundary>,
    );
    expect(screen.getByRole('status')).toHaveTextContent('Connecting');
    expect(await screen.findByText('Planner ready')).toBeInTheDocument();
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
  it('offers retry when the account service cannot connect', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Network unavailable')));
    render(
      <AuthBoundary>
        <p>Planner ready</p>
      </AuthBoundary>,
    );
    expect(await screen.findByRole('alert')).toHaveTextContent('Network unavailable');
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
    expect(screen.queryByText('Planner ready')).not.toBeInTheDocument();
  });
  it('replaces the query cache when the signed-in account changes', async () => {
    let owner = 'owner-one';
    const user = () => ({ id: owner, name: owner, email: 'owner@example.test', role: 'user' });
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async (url: string) =>
          new Response(
            JSON.stringify(
              url.includes('/auth/refresh')
                ? { accessToken: 'token', user: user() }
                : url.endsWith('/session')
                  ? { ...principal, user: { ...principal.user, id: owner } }
                  : { owner },
            ),
            { status: 200 },
          ),
      ),
    );
    function PrivateData() {
      const query = useQuery({
        queryKey: ['private'],
        queryFn: () => apiFetch<{ owner: string }>('/private'),
        staleTime: Infinity,
      });
      return <p>{query.data?.owner ?? 'Loading private data'}</p>;
    }
    render(
      <AuthBoundary>
        <PrivateData />
      </AuthBoundary>,
    );
    expect(await screen.findByText('owner-one')).toBeInTheDocument();
    await act(async () => {
      owner = 'owner-two';
      writeSession({ accessToken: 'new-token', user: user() });
    });
    expect(await screen.findByText('owner-two')).toBeInTheDocument();
    expect(screen.queryByText('owner-one')).not.toBeInTheDocument();
  });
});
