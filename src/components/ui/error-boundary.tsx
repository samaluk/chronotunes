"use client";

import { AlertCircle, RefreshCw } from "lucide-react";
import React, { type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: string | null;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: string) => void;
  className?: string;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
    const errorInfoString: string | null = errorInfo.componentStack || null;
    this.setState({ errorInfo: errorInfoString });
    if (this.props.onError) {
      this.props.onError(error, errorInfo.componentStack || "");
    }
  }

  handleRetry = (): void => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div
          className={cn(
            "flex flex-col items-center justify-center min-h-[200px] p-6 rounded-xl bg-card border border-destructive/20",
            this.props.className,
          )}
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10">
              <AlertCircle className="h-5 w-5 text-destructive" />
            </div>
            <h2 className="text-lg font-semibold">Something went wrong</h2>
          </div>
          <p className="text-sm text-muted-foreground text-center max-w-md mb-4">
            An unexpected error occurred. Please try again or refresh the page.
          </p>
          <Button onClick={this.handleRetry} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}

interface AsyncErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

interface AsyncErrorBoundaryProps {
  children: ReactNode;
  fallback?: (error: Error, retry: () => void) => ReactNode;
  className?: string;
}

export function AsyncErrorBoundary({
  children,
  fallback,
  className,
}: AsyncErrorBoundaryProps): ReactNode {
  const [state, setState] = React.useState<AsyncErrorBoundaryState>({
    hasError: false,
    error: null,
  });

  const handleRetry = (): void => {
    setState({ hasError: false, error: null });
  };

  if (state.hasError && state.error) {
    if (fallback) {
      return fallback(state.error, handleRetry);
    }

    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center min-h-[200px] p-6 rounded-xl bg-card border border-destructive/20",
          className,
        )}
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10">
            <AlertCircle className="h-5 w-5 text-destructive" />
          </div>
          <h2 className="text-lg font-semibold">Something went wrong</h2>
        </div>
        <p className="text-sm text-muted-foreground text-center max-w-md mb-4">
          {state.error.message || "An unexpected error occurred."}
        </p>
        <Button onClick={handleRetry} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Try Again
        </Button>
      </div>
    );
  }

  return <>{children}</>;
}
