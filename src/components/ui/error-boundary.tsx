"use client";

import { AlertCircle, RefreshCw } from "lucide-react";
import React from "react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ErrorBoundaryState {
  error: Error | null;
  errorInfo: string | null;
  hasError: boolean;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  className?: string;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: string) => void;
}

export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { error: null, errorInfo: null, hasError: false };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { error, hasError: true };
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
    this.setState({ error: null, errorInfo: null, hasError: false });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div
          className={cn(
            "flex min-h-[200px] flex-col items-center justify-center rounded-xl border border-destructive/20 bg-card p-6",
            this.props.className
          )}
        >
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10">
              <AlertCircle className="h-5 w-5 text-destructive" />
            </div>
            <h2 className="font-semibold text-lg">Something went wrong</h2>
          </div>
          <p className="mb-4 max-w-md text-center text-muted-foreground text-sm">
            An unexpected error occurred. Please try again or refresh the page.
          </p>
          <Button onClick={this.handleRetry} variant="outline">
            <RefreshCw className="mr-2 h-4 w-4" />
            Try Again
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}

interface AsyncErrorBoundaryState {
  error: Error | null;
  hasError: boolean;
}

interface AsyncErrorBoundaryProps {
  children: ReactNode;
  className?: string;
  fallback?: (error: Error, retry: () => void) => ReactNode;
}

export function AsyncErrorBoundary({
  children,
  fallback,
  className,
}: AsyncErrorBoundaryProps): React.ReactNode {
  const [state, setState] = React.useState<AsyncErrorBoundaryState>({
    error: null,
    hasError: false,
  });

  const handleRetry = (): void => {
    setState({ error: null, hasError: false });
  };

  if (state.hasError && state.error) {
    if (fallback) {
      return fallback(state.error, handleRetry);
    }

    return (
      <div
        className={cn(
          "flex min-h-[200px] flex-col items-center justify-center rounded-xl border border-destructive/20 bg-card p-6",
          className
        )}
      >
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10">
            <AlertCircle className="h-5 w-5 text-destructive" />
          </div>
          <h2 className="font-semibold text-lg">Something went wrong</h2>
        </div>
        <p className="mb-4 max-w-md text-center text-muted-foreground text-sm">
          {state.error.message || "An unexpected error occurred."}
        </p>
        <Button onClick={handleRetry} variant="outline">
          <RefreshCw className="mr-2 h-4 w-4" />
          Try Again
        </Button>
      </div>
    );
  }

  return <>{children}</>;
}
