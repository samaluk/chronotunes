import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SoftTimer } from "./SoftTimer";

describe("SoftTimer", () => {
  it("renders timer display", () => {
    const startedAt = Date.now() - 30 * 1000;

    render(<SoftTimer startedAt={startedAt} turnSeconds={60} />);

    expect(screen.getByText(/0:2\d/)).toBeInTheDocument();
  });

  it("shows warning styling when time is low", () => {
    const startedAt = Date.now() - 55 * 1000;

    render(<SoftTimer startedAt={startedAt} turnSeconds={60} lowTimeThreshold={10} />);

    const timerContainer = screen.getByText(/0:0\d/).closest("div");
    expect(timerContainer).toHaveClass("bg-destructive/10");
    expect(timerContainer).toHaveClass("text-destructive");
  });

  it("hides progress bar when showProgress is false", () => {
    const startedAt = Date.now() - 30 * 1000;

    render(<SoftTimer startedAt={startedAt} turnSeconds={60} showProgress={false} />);

    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
  });

  it("shows warning icon when time is low", () => {
    const startedAt = Date.now() - 55 * 1000;

    render(<SoftTimer startedAt={startedAt} turnSeconds={60} lowTimeThreshold={10} />);

    expect(screen.getByTestId("alert-triangle")).toBeInTheDocument();
  });

  it("applies custom className", () => {
    const startedAt = Date.now() - 30 * 1000;

    render(<SoftTimer startedAt={startedAt} turnSeconds={60} className="custom-class" />);

    expect(screen.getByText(/0:2\d/).closest(".custom-class")).not.toBeNull();
  });

  it("shows alert icon when low time threshold is exceeded", () => {
    const startedAt = Date.now() - 55 * 1000;

    render(<SoftTimer startedAt={startedAt} turnSeconds={60} lowTimeThreshold={10} />);

    expect(screen.getByTestId("alert-triangle")).toBeInTheDocument();
  });

  it("does not show alert icon when time is not low", () => {
    const startedAt = Date.now() - 30 * 1000;

    render(<SoftTimer startedAt={startedAt} turnSeconds={60} lowTimeThreshold={10} />);

    expect(screen.queryByTestId("alert-triangle")).not.toBeInTheDocument();
  });

  it("shows progress bar when showProgress is true", () => {
    const startedAt = Date.now() - 30 * 1000;

    render(<SoftTimer startedAt={startedAt} turnSeconds={60} showProgress={true} />);

    expect(screen.getByRole("progressbar")).toBeInTheDocument();
  });
});
