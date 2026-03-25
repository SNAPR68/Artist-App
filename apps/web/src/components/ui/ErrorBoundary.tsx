'use client';

import { Component, type ReactNode, type ErrorInfo } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <div className="flex flex-col items-center justify-center min-h-[300px] p-8">
          <h2 className="text-xl font-semibold text-nocturne-text-primary mb-2">Something went wrong</h2>
          <p className="text-nocturne-text-secondary mb-4">{this.state.error?.message}</p>
          <button
            onClick={() => this.setState({ hasError: false })}
            className="px-4 py-2 bg-nocturne-primary text-nocturne-text-primary rounded-lg hover:bg-nocturne-primary-hover"
          >
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
