import React from 'react';
import ErrorFallback from './error-fallback';

export interface ErrorFallbackProps {
  error: Error;
  resetError: () => void;
  showDetails?: boolean;
  [key: string]: any;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<ErrorFallbackProps>;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  onReset?: () => void;
  resetKeys?: Array<string | number>;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private resetTimeoutId: number | null = null;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by ErrorBoundary:', error, errorInfo);
    
    // Call optional error handler
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // In production, you could send error to logging service here
    if (process.env.NODE_ENV === 'production') {
      // Example: logErrorToService(error, errorInfo);
    }
  }

  private areResetKeysChanged(prevResetKeys: Array<string | number> | undefined, currentResetKeys: Array<string | number> | undefined): boolean {
    // Handle presence changes
    if (!prevResetKeys && !currentResetKeys) return false;
    if (!prevResetKeys || !currentResetKeys) return true;
    
    // Handle length changes
    if (prevResetKeys.length !== currentResetKeys.length) return true;
    
    // Handle content changes
    return currentResetKeys.some((resetKey, index) => prevResetKeys[index] !== resetKey);
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps) {
    const { resetKeys } = this.props;
    const { hasError } = this.state;

    // Auto-reset when resetKeys change
    if (hasError && this.areResetKeysChanged(prevProps.resetKeys, resetKeys)) {
      this.resetError();
    }
  }

  resetError = () => {
    // Clear any pending reset timeout
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId);
      this.resetTimeoutId = null;
    }

    // Call optional reset handler
    if (this.props.onReset) {
      this.props.onReset();
    }

    // Reset error state
    this.setState({ hasError: false, error: null });
  };

  render() {
    const { hasError, error } = this.state;
    const { children, fallback: FallbackComponent } = this.props;

    if (hasError && error) {
      // Use custom fallback if provided, otherwise use default ErrorFallback
      if (FallbackComponent) {
        return <FallbackComponent error={error} resetError={this.resetError} />;
      }

      // Use default ErrorFallback
      return <ErrorFallback error={error} resetError={this.resetError} />;
    }

    return children;
  }
}