import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  session: { accessToken: 'old-token', user: { id: 'owner-a' } } as {
    accessToken: string;
    user: { id: string };
  } | null,
  fetch: vi.fn(),
  refresh: vi.fn(),
}));
vi.mock('../auth/session', () => ({
  getSession: () => mocks.session,
  readAccessToken: () => mocks.session?.accessToken ?? null,
}));
vi.mock('../auth/main-auth', () => ({ refreshSession: mocks.refresh }));
vi.mock('../config', () => ({ serverUrls: () => ({ planner: 'https://planner.example/api/v1' }) }));
import { apiFetch } from './api';

const response = (status: number) =>
  new Response(JSON.stringify({ result: 'owner-a' }), { status });

describe('planner request ownership', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubGlobal('fetch', mocks.fetch);
    mocks.session = { accessToken: 'old-token', user: { id: 'owner-a' } };
  });

  it('does not refresh an old request after a QR begins changing accounts', async () => {
    let finish!: (value: Response) => void;
    mocks.fetch.mockImplementationOnce(
      () => new Promise<Response>((resolve) => (finish = resolve)),
    );
    const pending = apiFetch('/pets');
    const rejected = expect(pending).rejects.toMatchObject({ status: 401 });
    mocks.session = null;
    finish(response(401));
    await rejected;
    expect(mocks.refresh).not.toHaveBeenCalled();
  });

  it('does not expose an old owner response to a newly connected account', async () => {
    let finish!: (value: Response) => void;
    mocks.fetch.mockImplementationOnce(
      () => new Promise<Response>((resolve) => (finish = resolve)),
    );
    const pending = apiFetch('/pets');
    const rejected = expect(pending).rejects.toMatchObject({ status: 401 });
    mocks.session = { accessToken: 'new-token', user: { id: 'owner-b' } };
    finish(response(200));
    await rejected;
  });

  it('does not refresh an aborted account check', async () => {
    const controller = new AbortController();
    mocks.fetch.mockImplementationOnce(async () => {
      controller.abort();
      return response(401);
    });
    await expect(apiFetch('/session', { signal: controller.signal })).rejects.toMatchObject({
      status: 401,
    });
    expect(mocks.refresh).not.toHaveBeenCalled();
  });

  it('rejects old owner data when the account changes during response parsing', async () => {
    let finish!: (value: unknown) => void;
    let started!: () => void;
    const parsing = new Promise<void>((resolve) => (started = resolve));
    const delayed = response(200);
    vi.spyOn(delayed, 'json').mockImplementationOnce(() => {
      started();
      return new Promise((resolve) => (finish = resolve));
    });
    mocks.fetch.mockResolvedValueOnce(delayed);
    const pending = apiFetch('/pets');
    const rejected = expect(pending).rejects.toMatchObject({ status: 401 });
    await parsing;
    mocks.session = { accessToken: 'new-token', user: { id: 'owner-b' } };
    finish({ result: 'owner-a' });
    await rejected;
  });

  it('refreshes and retries once when the account has not changed', async () => {
    mocks.fetch.mockResolvedValueOnce(response(401)).mockResolvedValueOnce(response(200));
    mocks.refresh.mockImplementationOnce(async () => {
      mocks.session = { accessToken: 'fresh-token', user: { id: 'owner-a' } };
      return mocks.session;
    });
    await expect(apiFetch('/pets')).resolves.toEqual({ result: 'owner-a' });
    expect(mocks.refresh).toHaveBeenCalledTimes(1);
    expect(mocks.fetch).toHaveBeenCalledTimes(2);
  });
});
