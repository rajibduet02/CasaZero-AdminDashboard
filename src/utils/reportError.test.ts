import { describe, expect, it, vi } from 'vitest';
import { reportError, sanitizeErrorContext } from './reportError';

describe('Phase 3/4 — error sanitization', () => {
  it('redacts sensitive keys from context objects', () => {
    const sanitized = sanitizeErrorContext({
      api_token: 'super-secret-token',
      Authorization: 'Bearer abc.def',
      password: 'hunter2',
      message: 'ok',
      nested: { secret: 'x', safe: 1 },
    }) as Record<string, unknown>;

    expect(sanitized.api_token).toBe('[REDACTED]');
    expect(sanitized.Authorization).toBe('[REDACTED]');
    expect(sanitized.password).toBe('[REDACTED]');
    expect(sanitized.message).toBe('ok');
    expect((sanitized.nested as Record<string, unknown>).secret).toBe('[REDACTED]');
    expect((sanitized.nested as Record<string, unknown>).safe).toBe(1);
  });

  it('does not log raw tokens via reportError', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    reportError(new Error('boom'), {
      api_token: 'should-not-appear',
      Authorization: 'Bearer leak',
    });

    const serialized = JSON.stringify(spy.mock.calls);
    expect(serialized).not.toContain('should-not-appear');
    expect(serialized).not.toContain('Bearer leak');
    expect(serialized).toContain('[REDACTED]');

    spy.mockRestore();
  });
});
