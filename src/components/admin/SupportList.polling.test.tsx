import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LanguageProvider } from '../../utils/LanguageContext';
import {
  clearSession,
  setSession,
  getSessionToken,
} from '../../utils/session';
import {
  onAuthenticationFailure,
  resetAuthenticationFailureGate,
} from '../../utils/authFailure';
import { SupportList, TICKET_POLL_INTERVAL_MS, type SupportTicket } from './SupportList';

vi.mock('motion/react', () => ({
  motion: {
    div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
      <div {...props}>{children}</div>
    ),
  },
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn(), dismiss: vi.fn() },
}));

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function makeTicket(overrides: Partial<SupportTicket> & Pick<SupportTicket, 'id' | 'title' | 'status'>): SupportTicket {
  return {
    ticket_id: `T-${overrides.id}`,
    issue_type_id: 1,
    user_id: 10,
    description: 'desc',
    image: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    issue_type: {
      id: 1,
      issue_type_en: 'Plumbing',
      issue_type_it: 'Idraulica',
    },
    user: {
      id: 10,
      user_name: 'Alice',
      email: 'alice@example.com',
      profile_image: null,
      units: [
        {
          id: 1,
          residence_id: 1,
          unit_name: 'A1',
          unit_description: '',
          created_at: '2026-01-01T00:00:00Z',
          updated_at: '2026-01-01T00:00:00Z',
          pivot: { user_id: 10, unit_id: 1 },
          residence: {
            id: 1,
            residence_name: 'Residence One',
            residence_address: 'Addr',
          },
        },
      ],
    },
    ...overrides,
  };
}

function isTicketListCall(url: unknown): boolean {
  return typeof url === 'string' && url.includes('/all-support-tickets');
}

function renderSupportList() {
  return render(
    <LanguageProvider>
      <SupportList />
    </LanguageProvider>,
  );
}

describe('SupportList background polling', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    clearSession();
    resetAuthenticationFailureGate();
    setSession({ token: 'tok-test', user: { id: 1, role: 'superadmin' } });

    fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/all-support-tickets')) {
        return jsonResponse({ data: [makeTicket({ id: 1, title: 'Ticket A', status: 'pending' })] });
      }
      if (url.includes('/issue-type/list')) {
        return jsonResponse({ data: [] });
      }
      if (url.includes('/residences')) {
        return jsonResponse({ data: [] });
      }
      return jsonResponse({ data: [] });
    });
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it('loads tickets once on mount and schedules polling (no immediate duplicate)', async () => {
    renderSupportList();

    await waitFor(() => {
      expect(screen.getByText('Ticket A')).toBeInTheDocument();
    });

    const ticketCalls = fetchMock.mock.calls.filter(([url]) => isTicketListCall(url));
    expect(ticketCalls).toHaveLength(1);
  });

  it('polls the ticket API again after 10s and 20s', async () => {
    renderSupportList();

    await waitFor(() => {
      expect(screen.getByText('Ticket A')).toBeInTheDocument();
    });
    expect(fetchMock.mock.calls.filter(([url]) => isTicketListCall(url))).toHaveLength(1);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(TICKET_POLL_INTERVAL_MS);
    });
    await waitFor(() => {
      expect(fetchMock.mock.calls.filter(([url]) => isTicketListCall(url))).toHaveLength(2);
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(TICKET_POLL_INTERVAL_MS);
    });
    await waitFor(() => {
      expect(fetchMock.mock.calls.filter(([url]) => isTicketListCall(url))).toHaveLength(3);
    });
  });

  it('clears the interval on unmount so no further ticket requests occur', async () => {
    const { unmount } = renderSupportList();

    await waitFor(() => {
      expect(screen.getByText('Ticket A')).toBeInTheDocument();
    });

    unmount();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(TICKET_POLL_INTERVAL_MS * 3);
    });

    expect(fetchMock.mock.calls.filter(([url]) => isTicketListCall(url))).toHaveLength(1);
  });

  it('does not start a second poll while the first poll request is still in flight', async () => {
    let resolveSlow: ((value: Response) => void) | null = null;
    let ticketCall = 0;

    fetchMock.mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/all-support-tickets')) {
        ticketCall += 1;
        if (ticketCall === 1) {
          return jsonResponse({ data: [makeTicket({ id: 1, title: 'Ticket A', status: 'pending' })] });
        }
        return new Promise<Response>((resolve) => {
          resolveSlow = resolve;
        });
      }
      if (url.includes('/issue-type/list') || url.includes('/residences')) {
        return jsonResponse({ data: [] });
      }
      return jsonResponse({ data: [] });
    });

    renderSupportList();

    await waitFor(() => {
      expect(screen.getByText('Ticket A')).toBeInTheDocument();
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(TICKET_POLL_INTERVAL_MS);
    });
    await waitFor(() => {
      expect(fetchMock.mock.calls.filter(([url]) => isTicketListCall(url))).toHaveLength(2);
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(TICKET_POLL_INTERVAL_MS);
    });

    expect(fetchMock.mock.calls.filter(([url]) => isTicketListCall(url))).toHaveLength(2);

    await act(async () => {
      resolveSlow?.(jsonResponse({ data: [makeTicket({ id: 1, title: 'Ticket A', status: 'pending' })] }));
    });
  });

  it('shows a newly created ticket after the next poll', async () => {
    let ticketCall = 0;
    fetchMock.mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/all-support-tickets')) {
        ticketCall += 1;
        if (ticketCall === 1) {
          return jsonResponse({ data: [makeTicket({ id: 1, title: 'Ticket A', status: 'pending' })] });
        }
        return jsonResponse({
          data: [
            makeTicket({ id: 1, title: 'Ticket A', status: 'pending' }),
            makeTicket({ id: 2, title: 'Ticket B', status: 'pending' }),
          ],
        });
      }
      return jsonResponse({ data: [] });
    });

    renderSupportList();

    await waitFor(() => {
      expect(screen.getByText('Ticket A')).toBeInTheDocument();
    });
    expect(screen.queryByText('Ticket B')).not.toBeInTheDocument();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(TICKET_POLL_INTERVAL_MS);
    });

    await waitFor(() => {
      expect(screen.getByText('Ticket B')).toBeInTheDocument();
    });
  });

  it('reflects an updated ticket status from polling', async () => {
    let ticketCall = 0;
    fetchMock.mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/all-support-tickets')) {
        ticketCall += 1;
        if (ticketCall === 1) {
          return jsonResponse({ data: [makeTicket({ id: 1, title: 'Ticket A', status: 'pending' })] });
        }
        return jsonResponse({ data: [makeTicket({ id: 1, title: 'Ticket A', status: 'resolved' })] });
      }
      return jsonResponse({ data: [] });
    });

    renderSupportList();

    await waitFor(() => {
      expect(screen.getByText('Ticket A')).toBeInTheDocument();
    });

    const rowBefore = screen.getByText('Ticket A').closest('tr');
    expect(rowBefore).toBeTruthy();
    expect(within(rowBefore as HTMLElement).getByText(/pending|in attesa/i)).toBeInTheDocument();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(TICKET_POLL_INTERVAL_MS);
    });

    await waitFor(() => {
      const rowAfter = screen.getByText('Ticket A').closest('tr');
      expect(rowAfter).toBeTruthy();
      expect(within(rowAfter as HTMLElement).getByText(/resolved|risolti/i)).toBeInTheDocument();
    });
  });

  it('keeps existing tickets visible when a background poll fails', async () => {
    let ticketCall = 0;
    fetchMock.mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/all-support-tickets')) {
        ticketCall += 1;
        if (ticketCall === 1) {
          return jsonResponse({ data: [makeTicket({ id: 1, title: 'Ticket A', status: 'pending' })] });
        }
        return jsonResponse({ message: 'server error' }, 500);
      }
      return jsonResponse({ data: [] });
    });

    renderSupportList();

    await waitFor(() => {
      expect(screen.getByText('Ticket A')).toBeInTheDocument();
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(TICKET_POLL_INTERVAL_MS);
    });

    await waitFor(() => {
      expect(fetchMock.mock.calls.filter(([url]) => isTicketListCall(url))).toHaveLength(2);
    });

    expect(screen.getByText('Ticket A')).toBeInTheDocument();
    expect(screen.queryByText(/loading tickets|caricamento ticket/i)).not.toBeInTheDocument();
  });

  it('preserves search text across a successful poll', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

    fetchMock.mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/all-support-tickets')) {
        return jsonResponse({
          data: [
            makeTicket({ id: 1, title: 'water leak', status: 'pending' }),
            makeTicket({ id: 2, title: 'heater', status: 'pending' }),
          ],
        });
      }
      return jsonResponse({ data: [] });
    });

    renderSupportList();

    await waitFor(() => {
      expect(screen.getByText('water leak')).toBeInTheDocument();
    });

    const search = screen.getByPlaceholderText(/search tickets|cerca ticket/i);
    await user.type(search, 'water');
    expect(search).toHaveValue('water');

    await waitFor(() => {
      expect(screen.getByText('water leak')).toBeInTheDocument();
      expect(screen.queryByText('heater')).not.toBeInTheDocument();
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(TICKET_POLL_INTERVAL_MS);
    });

    expect(search).toHaveValue('water');
    expect(screen.getByText('water leak')).toBeInTheDocument();
    expect(screen.queryByText('heater')).not.toBeInTheDocument();
  });

  it('uses existing auth failure handling on polling 401', async () => {
    const listener = vi.fn();
    onAuthenticationFailure(listener);

    let ticketCall = 0;
    fetchMock.mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/all-support-tickets')) {
        ticketCall += 1;
        if (ticketCall === 1) {
          return jsonResponse({ data: [makeTicket({ id: 1, title: 'Ticket A', status: 'pending' })] });
        }
        return jsonResponse({ message: 'Unauthorized' }, 401);
      }
      return jsonResponse({ data: [] });
    });

    renderSupportList();

    await waitFor(() => {
      expect(screen.getByText('Ticket A')).toBeInTheDocument();
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(TICKET_POLL_INTERVAL_MS);
    });

    await waitFor(() => {
      expect(getSessionToken()).toBeNull();
      expect(listener).toHaveBeenCalled();
    });
  });

  it('does not log the user out on polling 403', async () => {
    const listener = vi.fn();
    onAuthenticationFailure(listener);

    let ticketCall = 0;
    fetchMock.mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/all-support-tickets')) {
        ticketCall += 1;
        if (ticketCall === 1) {
          return jsonResponse({ data: [makeTicket({ id: 1, title: 'Ticket A', status: 'pending' })] });
        }
        return jsonResponse({ message: 'Forbidden' }, 403);
      }
      return jsonResponse({ data: [] });
    });

    renderSupportList();

    await waitFor(() => {
      expect(screen.getByText('Ticket A')).toBeInTheDocument();
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(TICKET_POLL_INTERVAL_MS);
    });

    await waitFor(() => {
      expect(fetchMock.mock.calls.filter(([url]) => isTicketListCall(url))).toHaveLength(2);
    });

    expect(getSessionToken()).toBe('tok-test');
    expect(listener).not.toHaveBeenCalled();
    expect(screen.getByText('Ticket A')).toBeInTheDocument();
  });
});
