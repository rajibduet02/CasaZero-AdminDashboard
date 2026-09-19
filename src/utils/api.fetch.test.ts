import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  apiFetch,
  safeJsonParse,
  invalidateAdminDashboardOverview,
  invalidateResidencesCatalog,
  invalidateUnitListCatalog,
  invalidateUsersCatalog,
  resetSessionValidationEndpointForTests,
} from './api';
import {
  handleAuthenticationFailure,
  onAuthenticationFailure,
  resetAuthenticationFailureGate,
  isHandlingAuthenticationFailure,
} from './authFailure';
import { setSession, getSessionToken, clearSession } from './session';

vi.mock('sonner', () => ({
  toast: { dismiss: vi.fn(), error: vi.fn(), success: vi.fn() },
}));

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('apiFetch', () => {
  beforeEach(() => {
    clearSession();
    resetAuthenticationFailureGate();
    invalidateResidencesCatalog();
    invalidateUnitListCatalog();
    invalidateUsersCatalog();
    invalidateAdminDashboardOverview();
    resetSessionValidationEndpointForTests();
    vi.unstubAllGlobals();
  });

  it('attaches Bearer token for authenticated requests', async () => {
    setSession({ token: 'tok-abc', user: { id: 1, role: 'admin' } });
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ ok: true }, 200));
    vi.stubGlobal('fetch', fetchMock);

    await apiFetch('/api/example', { method: 'GET' });

    const init = fetchMock.mock.calls[0][1] as RequestInit;
    const headers = new Headers(init.headers);
    expect(headers.get('Authorization')).toBe('Bearer tok-abc');
  });

  it('skips Authorization when skipAuth is set', async () => {
    setSession({ token: 'tok-abc', user: { id: 1, role: 'admin' } });
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ ok: true }, 200));
    vi.stubGlobal('fetch', fetchMock);

    await apiFetch('/api/user/web_login', { method: 'POST', skipAuth: true });

    const headers = new Headers((fetchMock.mock.calls[0][1] as RequestInit).headers);
    expect(headers.get('Authorization')).toBeNull();
  });

  it('triggers auth failure on 401 and clears session', async () => {
    setSession({ token: 'bad', user: { id: 1, role: 'admin' } });
    const listener = vi.fn();
    onAuthenticationFailure(listener);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ message: 'Unauthorized' }, 401)));

    const response = await apiFetch('/api/admin-dashboard/overview', { method: 'POST' });

    expect(response.status).toBe(401);
    expect(getSessionToken()).toBeNull();
    expect(listener).toHaveBeenCalledTimes(1);
    expect(isHandlingAuthenticationFailure()).toBe(true);
  });

  it('does not log out on 403', async () => {
    setSession({ token: 'good', user: { id: 1, role: 'admin' } });
    const listener = vi.fn();
    onAuthenticationFailure(listener);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ message: 'Forbidden' }, 403)));

    const response = await apiFetch('/api/restricted', { method: 'GET' });

    expect(response.status).toBe(403);
    expect(getSessionToken()).toBe('good');
    expect(listener).not.toHaveBeenCalled();
    expect(isHandlingAuthenticationFailure()).toBe(false);
  });

  it('does not treat login 401 as session invalidation when skipAuthFailureHandling', async () => {
    setSession({ token: 'existing', user: { id: 1, role: 'admin' } });
    const listener = vi.fn();
    onAuthenticationFailure(listener);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ message: 'bad creds' }, 401)));

    await apiFetch('/api/user/web_login', {
      method: 'POST',
      skipAuth: true,
      skipAuthFailureHandling: true,
    });

    expect(getSessionToken()).toBe('existing');
    expect(listener).not.toHaveBeenCalled();
  });

  it('triggers auth failure on Invalid token JSON even without 401', async () => {
    setSession({ token: 'stale', user: { id: 1, role: 'admin' } });
    const listener = vi.fn();
    onAuthenticationFailure(listener);
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(jsonResponse({ status: false, message: 'Invalid token' }, 200)),
    );

    await apiFetch('/api/some-list', { method: 'POST' });

    expect(getSessionToken()).toBeNull();
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('returns 500 responses without clearing session', async () => {
    setSession({ token: 'good', user: { id: 1, role: 'admin' } });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ message: 'boom' }, 500)));

    const response = await apiFetch('/api/x');
    expect(response.status).toBe(500);
    expect(getSessionToken()).toBe('good');
  });

  it('propagates network rejection without clearing session', async () => {
    setSession({ token: 'good', user: { id: 1, role: 'admin' } });
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));

    await expect(apiFetch('/api/x')).rejects.toThrow('Failed to fetch');
    expect(getSessionToken()).toBe('good');
  });

  it('does not re-enter auth failure while gate is already open (anti-loop)', async () => {
    setSession({ token: 'bad', user: { id: 1, role: 'admin' } });
    const listener = vi.fn();
    onAuthenticationFailure(listener);
    handleAuthenticationFailure({ reason: 'api_401', status: 401 });
    expect(listener).toHaveBeenCalledTimes(1);

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({}, 401)));
    await apiFetch('/api/again');

    expect(listener).toHaveBeenCalledTimes(1);
  });
});

describe('safeJsonParse', () => {
  it('parses valid JSON', async () => {
    const data = await safeJsonParse<{ a: number }>(jsonResponse({ a: 1 }));
    expect(data).toEqual({ a: 1 });
  });

  it('rejects HTML bodies', async () => {
    const response = new Response('<!DOCTYPE html><html></html>', {
      status: 502,
      headers: { 'Content-Type': 'text/html' },
    });
    await expect(safeJsonParse(response)).rejects.toThrow(/HTML/);
  });

  it('rejects empty bodies', async () => {
    const response = new Response('', {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
    await expect(safeJsonParse(response)).rejects.toThrow(/empty/i);
  });

  it('rejects malformed JSON', async () => {
    const response = new Response('{not-json', {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
    await expect(safeJsonParse(response)).rejects.toThrow(/Invalid JSON/);
  });
});
