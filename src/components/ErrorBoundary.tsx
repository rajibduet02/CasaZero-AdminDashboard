import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import { reportError } from '../utils/reportError';

type ErrorBoundaryProps = {
  children: ReactNode;
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
        <div className="min-h-screen flex items-center justify-center bg-surface-warm-50 p-6">
          <div className="text-center max-w-sm space-y-4">
            <p className="text-sm text-gray-700">Something went wrong.</p>
            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={this.handleTryAgain}
                className="text-sm px-3 py-2 rounded border border-gray-300 bg-white text-gray-800 hover:bg-gray-50"
              >
                Try again
              </button>
              <button
                type="button"
                onClick={this.handleReload}
                className="text-sm px-3 py-2 rounded border border-gray-300 bg-white text-gray-800 hover:bg-gray-50"
              >
                Reload
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
