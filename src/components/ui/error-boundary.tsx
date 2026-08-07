"use client";

import { AlertCircle, RefreshCw } from "lucide-react";
import { catchError, type ErrorInfo } from "next/error";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ErrorBoundaryProps {
  className?: string;
  fallback?: ReactNode;
}

function ErrorFallback(
  { className, fallback }: ErrorBoundaryProps,
  { retry }: ErrorInfo,
): ReactNode {
  if (fallback !== undefined) {
    return fallback;
  }

  return (
    <div
      className={cn(
        "flex min-h-[200px] flex-col items-center justify-center rounded-xl border border-destructive/20 bg-card p-6",
        className,
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
      <Button onClick={() => retry()} variant="outline">
        <RefreshCw className="mr-2 h-4 w-4" />
        Try Again
      </Button>
    </div>
  );
}

export const ErrorBoundary = catchError(ErrorFallback);
