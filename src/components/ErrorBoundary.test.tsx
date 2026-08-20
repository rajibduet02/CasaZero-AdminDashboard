import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ErrorBoundary } from '../components/ErrorBoundary';

vi.mock('../utils/reportError', () => ({
  reportError: vi.fn(),
}));

function Controlled({ fail }: { fail: boolean }) {
  if (fail) throw new Error('render crash');
  return <div>ok</div>;
}

describe('ErrorBoundary', () => {
  it('shows a safe fallback instead of a blank page', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    render(
      <ErrorBoundary>
        <Controlled fail />
      </ErrorBoundary>,
    );

    expect(screen.getByText('Something went wrong.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reload' })).toBeInTheDocument();
    expect(screen.queryByText(/render crash/i)).not.toBeInTheDocument();

    spy.mockRestore();
  });

  it('recovers via Try again after the child stops throwing', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    const { rerender } = render(
      <ErrorBoundary>
        <Controlled fail />
      </ErrorBoundary>,
    );

    expect(screen.getByText('Something went wrong.')).toBeInTheDocument();

    rerender(
      <ErrorBoundary>
        <Controlled fail={false} />
      </ErrorBoundary>,
    );

    // Boundary still holds error state until recovery.
    expect(screen.getByText('Something went wrong.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(screen.getByText('ok')).toBeInTheDocument();

    spy.mockRestore();
  });
});
