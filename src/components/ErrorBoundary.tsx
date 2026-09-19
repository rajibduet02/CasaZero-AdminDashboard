import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import { reportError } from '../utils/reportError';

type ErrorBoundaryProps = {
  children: ReactNode;
  /** Optional label for diagnostic context */
  name?: string;
};

type ErrorBoundaryState = {
  hasError: boolean;
};

/**
 * Global render/lifecycle isolation. Does not catch async/event errors.
 * Fallback uses existing surface styles — no new design system.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    reportError(error, {
      source: 'ErrorBoundary',
      name: this.props.name ?? 'root',
      componentStack: info.componentStack ? '[omitted]' : undefined,
    });
  }

  private handleReload = (): void => {
    window.location.reload();
  };

  private handleTryAgain = (): void => {
    this.setState({ hasError: false });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div
          role="alert"
          className="min-h-[40vh] flex items-center justify-center bg-surface-warm-50 p-6"
        >
          <div className="text-center max-w-md space-y-4 rounded-2xl border border-neutral-line-200 bg-white p-8 shadow-sm">
            <h2 className="text-lg font-semibold text-neutral-ink-900">Something went wrong</h2>
            <p className="text-sm text-neutral-ink-500">
              We couldn&apos;t display this section correctly.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
              <button
                type="button"
                onClick={this.handleTryAgain}
                className="text-sm px-4 py-2 rounded-xl border border-neutral-line-200 bg-white text-neutral-ink-800 hover:bg-neutral-line-50"
              >
                Try Again
              </button>
              <button
                type="button"
                onClick={this.handleReload}
                className="text-sm px-4 py-2 rounded-xl border border-neutral-line-200 bg-white text-neutral-ink-800 hover:bg-neutral-line-50"
              >
                Reload Dashboard
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
