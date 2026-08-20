import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  fetchResidencesCatalog,
  invalidateResidencesCatalog,
  fetchAdminDashboardOverview,
  invalidateAdminDashboardOverview,
  fetchCondominiumAdminMaintenances,
  MAINTENANCE_FETCH_CONCURRENCY,
  validateStoredSession,
  resetSessionValidationEndpointForTests,
} from './api';
import { resetAuthenticationFailureGate } from './authFailure';
import { setSession, clearSession } from './session';

vi.mock('sonner', () => ({
  toast: { dismiss: vi.fn(), error: vi.fn(), success: vi.fn() },
}));

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('Phase 1 — residence catalog cache', () => {
  beforeEach(() => {
    clearSession();
    resetAuthenticationFailureGate();
    invalidateResidencesCatalog();
    setSession({
      token: 't',
      user: { id: 9, role: 'super_admin', email: 's@c.com' },
    });
  });

  it('reuses cached catalog for a second consumer without another network call', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({ status: true, data: [{ id: 1, name: 'A' }] }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const first = await fetchResidencesCatalog();
    const second = await fetchResidencesCatalog();
    const firstBody = await first.json();
    const secondBody = await second.json();

    expect(firstBody).toEqual(secondBody);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('invalidates cache so the next call hits the network', async () => {
    const fetchMock = vi.fn().mockImplementation(() =>
      Promise.resolve(jsonResponse({ status: true, data: [{ id: 1 }] })),
    );
    vi.stubGlobal('fetch', fetchMock);

    await fetchResidencesCatalog();
    invalidateResidencesCatalog();
    await fetchResidencesCatalog();

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});

describe('Phase 1 — overview cache', () => {
  beforeEach(() => {
    clearSession();
    resetAuthenticationFailureGate();
    invalidateAdminDashboardOverview();
    setSession({ token: 't', user: { id: 1, role: 'super_admin' } });
  });

  it('shares overview result across concurrent consumers', async () => {
    const overview = {
      status: true,
      data: {
        total_users: 1,
        total_units: 2,
        total_documents: 3,
        total_maintenances: 4,
      },
    };
    const fetchMock = vi.fn().mockImplementation(
      () =>
        new Promise<Response>((resolve) => {
          setTimeout(() => resolve(jsonResponse(overview)), 20);
        }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const [a, b] = await Promise.all([
      fetchAdminDashboardOverview(),
      fetchAdminDashboardOverview(),
    ]);

    expect(a).toEqual(overview.data);
    expect(b).toEqual(overview.data);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe('Phase 1 — session validation', () => {
  beforeEach(() => {
    clearSession();
    resetAuthenticationFailureGate();
    resetSessionValidationEndpointForTests();
    setSession({ token: 't', user: { id: 1, role: 'admin' } });
  });

  it('prefers POST /auth/check when available', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ status: true }, 200));
    vi.stubGlobal('fetch', fetchMock);

    const result = await validateStoredSession();
    expect(result).toEqual({ ok: true });
    expect(String(fetchMock.mock.calls[0][0])).toContain('/auth/check');
  });

  it('falls back to overview when /auth/check is missing (404)', async () => {
    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (String(url).includes('/auth/check')) {
        return Promise.resolve(jsonResponse({ message: 'Not Found' }, 404));
      }
      return Promise.resolve(jsonResponse({ status: true, data: {} }, 200));
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await validateStoredSession();
    expect(result).toEqual({ ok: true });
    expect(fetchMock.mock.calls.some((c) => String(c[0]).includes('/auth/check'))).toBe(true);
    expect(
      fetchMock.mock.calls.some((c) => String(c[0]).includes('/admin-dashboard/overview')),
    ).toBe(true);
  });

  it('returns unauthorized on 401 without looping', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ message: 'Invalid token' }, 401));
    vi.stubGlobal('fetch', fetchMock);

    const result = await validateStoredSession();
    expect(result).toEqual({ ok: false, reason: 'unauthorized' });
  });

  it('treats network errors as inconclusive (ok: true)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('offline')));
    const result = await validateStoredSession();
    expect(result).toEqual({ ok: true });
  });
});

describe('Phase 1 — maintenance concurrency', () => {
  beforeEach(() => {
    clearSession();
    resetAuthenticationFailureGate();
    setSession({
      token: 't',
      user: {
        id: 5,
        role: 'admin',
        residences: [{ residence_id: 1 }, { residence_id: 2 }, { residence_id: 3 }, { residence_id: 4 }, { residence_id: 5 }, { residence_id: 6 }],
      },
    });
  });

  it('keeps concurrency at 5 and does not exceed it', async () => {
    expect(MAINTENANCE_FETCH_CONCURRENCY).toBe(5);

    let inFlight = 0;
    let maxInFlight = 0;

    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(() => {
        inFlight += 1;
        maxInFlight = Math.max(maxInFlight, inFlight);
        return new Promise<Response>((resolve) => {
          setTimeout(() => {
            inFlight -= 1;
            resolve(jsonResponse({ status: true, data: [] }));
          }, 30);
        });
      }),
    );

    await fetchCondominiumAdminMaintenances(undefined, {
      residenceIds: [1, 2, 3, 4, 5, 6, 7],
    });

    expect(maxInFlight).toBeLessThanOrEqual(5);
    expect(maxInFlight).toBe(5);
  });
});
