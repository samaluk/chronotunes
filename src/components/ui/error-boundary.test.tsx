import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ErrorBoundary } from "./error-boundary";

function FlakyChild({ fail }: { fail: boolean }): React.ReactNode {
  if (fail) {
    throw new Error("boom");
  }
  return <p>Recovered content</p>;
}

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe(ErrorBoundary, () => {
  it("renders children when no error is thrown", () => {
    render(
      <ErrorBoundary>
        <p>All good</p>
      </ErrorBoundary>,
    );

    expect(screen.getByText("All good")).toBeInTheDocument();
  });

  it("renders the error UI when a child throws", () => {
    render(
      <ErrorBoundary>
        <FlakyChild fail />
      </ErrorBoundary>,
    );

    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Try Again" })).toBeInTheDocument();
  });

  it("re-renders children after retry once the error clears", () => {
    let fail = true;
    function ControlledChild(): React.ReactNode {
      if (fail) {
        throw new Error("boom");
      }
      return <p>Recovered content</p>;
    }

    render(
      <ErrorBoundary>
        <ControlledChild />
      </ErrorBoundary>,
    );

    expect(screen.getByText("Something went wrong")).toBeInTheDocument();

    fail = false;
    fireEvent.click(screen.getByRole("button", { name: "Try Again" }));

    expect(screen.queryByText("Something went wrong")).not.toBeInTheDocument();
    expect(screen.getByText("Recovered content")).toBeInTheDocument();
  });

  it("renders a custom fallback when provided", () => {
    render(
      <ErrorBoundary fallback={<p>Custom fallback</p>}>
        <FlakyChild fail />
      </ErrorBoundary>,
    );

    expect(screen.getByText("Custom fallback")).toBeInTheDocument();
  });
});
