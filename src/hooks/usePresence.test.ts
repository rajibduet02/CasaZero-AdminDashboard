import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePresence } from '../hooks/usePresence';

const unsubscribeSpy = vi.fn();
const subscribeSpy = vi.fn(() => unsubscribeSpy);

vi.mock('../services/presenceService', () => ({
  subscribeToUsersPresence: (...args: unknown[]) => subscribeSpy(...args),
}));

describe('Firebase presence cleanup', () => {
  beforeEach(() => {
    subscribeSpy.mockClear();
    unsubscribeSpy.mockClear();
    subscribeSpy.mockImplementation(() => unsubscribeSpy);
  });

  it('subscribes when enabled and unsubscribes on disable/unmount', () => {
    const { rerender, unmount } = renderHook(
      ({ enabled }) => usePresence({ userIds: [10, 20], enabled }),
      { initialProps: { enabled: true } },
    );

    expect(subscribeSpy).toHaveBeenCalledTimes(1);

    rerender({ enabled: false });
    expect(unsubscribeSpy).toHaveBeenCalledTimes(1);

    rerender({ enabled: true });
    expect(subscribeSpy).toHaveBeenCalledTimes(2);

    unmount();
    expect(unsubscribeSpy).toHaveBeenCalledTimes(2);
  });

  it('does not create duplicate subscriptions for stable userIds while enabled', () => {
    const { rerender } = renderHook(
      ({ enabled }) => usePresence({ userIds: [1], enabled }),
      { initialProps: { enabled: true } },
    );

    rerender({ enabled: true });
    expect(subscribeSpy).toHaveBeenCalledTimes(1);
  });

  it('repeated open/close cycles clean up each presence subscription', () => {
    const { rerender } = renderHook(
      ({ enabled }) => usePresence({ userIds: [7], enabled }),
      { initialProps: { enabled: false } },
    );

    act(() => {
      rerender({ enabled: true });
    });
    act(() => {
      rerender({ enabled: false });
    });
    act(() => {
      rerender({ enabled: true });
    });
    act(() => {
      rerender({ enabled: false });
    });

    expect(subscribeSpy).toHaveBeenCalledTimes(2);
    expect(unsubscribeSpy).toHaveBeenCalledTimes(2);
  });
});
