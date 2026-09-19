import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  handleAuthenticationFailure,
  isAuthenticationFailureStatus,
  isHandlingAuthenticationFailure,
  isInvalidTokenPayload,
  onAuthenticationFailure,
  resetAuthenticationFailureGate,
} from '../utils/authFailure';
import { setSession, getSessionToken, clearSession } from '../utils/session';

vi.mock('sonner', () => ({
  toast: { dismiss: vi.fn(), error: vi.fn(), success: vi.fn(), warning: vi.fn() },
}));

vi.mock('../utils/notifyError', async () => {
  const actual = await vi.importActual<typeof import('../utils/notifyError')>('../utils/notifyError');
  return {
    ...actual,
    setSessionExpiredNotice: vi.fn(),
  };
});

describe('Authentication failure handling', () => {
  beforeEach(() => {
    clearSession();
    resetAuthenticationFailureGate();
  });

  it('treats only HTTP 401 as authentication failure status', () => {
    expect(isAuthenticationFailureStatus(401)).toBe(true);
    expect(isAuthenticationFailureStatus(403)).toBe(false);
    expect(isAuthenticationFailureStatus(500)).toBe(false);
  });

  it('detects invalid-token JSON payloads', () => {
    expect(isInvalidTokenPayload({ message: 'Invalid token' })).toBe(true);
    expect(isInvalidTokenPayload({ message: 'Token expired' })).toBe(true);
    expect(isInvalidTokenPayload({ message: 'Forbidden for role' })).toBe(false);
  });

  it('clears session and notifies listener once on auth failure (single-flight)', () => {
    setSession({
      token: 'secret-token-value',
      user: { id: 1, role: 'admin', email: 'a@b.com' },
    });
    expect(getSessionToken()).toBe('secret-token-value');

    const listener = vi.fn();
    onAuthenticationFailure(listener);

    handleAuthenticationFailure({ reason: 'api_401', status: 401, url: '/api/x' });
    handleAuthenticationFailure({ reason: 'api_401', status: 401, url: '/api/y' });

    expect(getSessionToken()).toBeNull();
    expect(listener).toHaveBeenCalledTimes(1);
    expect(isHandlingAuthenticationFailure()).toBe(true);
  });

  it('allows a new failure cycle after resetAuthenticationFailureGate (post-login)', () => {
    const listener = vi.fn();
    onAuthenticationFailure(listener);

    handleAuthenticationFailure({ reason: 'api_401', status: 401 });
    expect(listener).toHaveBeenCalledTimes(1);

    resetAuthenticationFailureGate();
    expect(isHandlingAuthenticationFailure()).toBe(false);

    handleAuthenticationFailure({ reason: 'api_401', status: 401 });
    expect(listener).toHaveBeenCalledTimes(2);
  });
});
