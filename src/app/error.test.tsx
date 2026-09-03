import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import ErrorPage from "./error";

vi.mock(import("next-intl"), () => ({
  useTranslations: () => (key: string) => `translated:${key}`,
}));

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe(ErrorPage, () => {
  it("renders translated error UI", () => {
    render(<ErrorPage error={new Error("boom")} retry={() => {}} />);

    // oxlint-disable-next-line typescript/no-unsafe-call
    expect(screen.getByText("translated:somethingWrong")).toBeInTheDocument();
    // oxlint-disable-next-line typescript/no-unsafe-call
    expect(screen.getByRole("button", { name: "translated:tryAgain" })).toBeInTheDocument();
  });

  it("calls retry when Try Again is clicked", () => {
    const retry = vi.fn();
    render(<ErrorPage error={new Error("boom")} retry={retry} />);

    fireEvent.click(screen.getByRole("button", { name: "translated:tryAgain" }));

    expect(retry).toHaveBeenCalledOnce();
  });
});
