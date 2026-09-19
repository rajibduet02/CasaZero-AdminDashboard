import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePresence } from '../hooks/usePresence';

const unsubscribeSpy = vi.fn();
const subscribeSpy = vi.fn(() => unsubscribeSpy);

vi.mock('../services/presenceService', () => ({
  subscribeToUserPresence: (...args: unknown[]) => subscribeSpy(...args),
  subscribeToUsersPresence: vi.fn(),
}));

describe('Firebase presence cleanup', () => {
  beforeEach(() => {
    subscribeSpy.mockClear();
    unsubscribeSpy.mockClear();
    subscribeSpy.mockImplementation(() => unsubscribeSpy);
  });

  it('subscribes when enabled and unsubscribes on disable/unmount', () => {
    const { rerender, unmount } = renderHook(
      ({ enabled, userIds }: { enabled: boolean; userIds: number[] }) =>
        usePresence({ userIds, enabled }),
      { initialProps: { enabled: true, userIds: [10, 20] } },
    );

    expect(subscribeSpy).toHaveBeenCalledTimes(2);

    rerender({ enabled: false, userIds: [10, 20] });
    expect(unsubscribeSpy).toHaveBeenCalledTimes(2);

    rerender({ enabled: true, userIds: [10, 20] });
    expect(subscribeSpy).toHaveBeenCalledTimes(4);

    unmount();
    expect(unsubscribeSpy).toHaveBeenCalledTimes(4);
  });

  it('does not create duplicate subscriptions for stable userIds while enabled', () => {
    const { rerender } = renderHook(
      ({ enabled, userIds }: { enabled: boolean; userIds: number[] }) =>
        usePresence({ userIds, enabled }),
      { initialProps: { enabled: true, userIds: [1] } },
    );

    rerender({ enabled: true, userIds: [1] });
    expect(subscribeSpy).toHaveBeenCalledTimes(1);
  });

  it('adds a listener for a new id without resubscribing existing ids', () => {
    const { rerender } = renderHook(
      ({ enabled, userIds }: { enabled: boolean; userIds: number[] }) =>
        usePresence({ userIds, enabled }),
      { initialProps: { enabled: true, userIds: [1] } },
    );

    expect(subscribeSpy).toHaveBeenCalledTimes(1);

    rerender({ enabled: true, userIds: [1, 2] });
    expect(subscribeSpy).toHaveBeenCalledTimes(2);
    expect(unsubscribeSpy).not.toHaveBeenCalled();
  });

  it('repeated open/close cycles clean up each presence subscription', () => {
    const { rerender } = renderHook(
      ({ enabled }: { enabled: boolean }) => usePresence({ userIds: [7], enabled }),
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
