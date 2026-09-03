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

describe("ErrorBoundary", () => {
  it("renders children when no error is thrown", () => {
    render(
      <ErrorBoundary>
        <p>All good</p>
      </ErrorBoundary>,
    );

    // oxlint-disable-next-line typescript/no-unsafe-call
    expect(screen.getByText("All good")).toBeInTheDocument();
  });

  it("renders the error UI when a child throws", () => {
    render(
      <ErrorBoundary>
        <FlakyChild fail />
      </ErrorBoundary>,
    );

    // oxlint-disable-next-line typescript/no-unsafe-call
    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    // oxlint-disable-next-line typescript/no-unsafe-call
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

    // oxlint-disable-next-line typescript/no-unsafe-call
    expect(screen.getByText("Something went wrong")).toBeInTheDocument();

    fail = false;
    fireEvent.click(screen.getByRole("button", { name: "Try Again" }));

    // oxlint-disable-next-line typescript/no-unsafe-call
    expect(screen.queryByText("Something went wrong")).not.toBeInTheDocument();
    // oxlint-disable-next-line typescript/no-unsafe-call
    expect(screen.getByText("Recovered content")).toBeInTheDocument();
  });

  it("renders a custom fallback when provided", () => {
    render(
      <ErrorBoundary fallback={<p>Custom fallback</p>}>
        <FlakyChild fail />
      </ErrorBoundary>,
    );

    // oxlint-disable-next-line typescript/no-unsafe-call
    expect(screen.getByText("Custom fallback")).toBeInTheDocument();
  });
});
