import { describe, expect, it } from 'vitest';
import { parseApiError } from './apiError';

describe('parseApiError', () => {
  it('maps network TypeError', () => {
    const result = parseApiError(new TypeError('Failed to fetch'));
    expect(result.code).toBe('NETWORK');
    expect(result.message.toLowerCase()).toContain('network');
  });

  it('maps HTTP status from Error message', () => {
    const result = parseApiError(new Error('HTTP error! status: 403'));
    expect(result.status).toBe(403);
    expect(result.message.toLowerCase()).toContain('permission');
  });

  it('sanitizes sensitive messages', () => {
    const result = parseApiError(new Error('api_token=supersecrettokenvalue123'));
    expect(result.message).not.toMatch(/supersecret/i);
  });

  it('uses fallback for unknown values', () => {
    const result = parseApiError(null, { fallbackMessage: 'Custom fallback' });
    expect(result.message).toBe('Custom fallback');
  });
});
