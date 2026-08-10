import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { createElement } from "react";
import type { ComponentProps } from "react";
import { expect, test, vi } from "vitest";

import messages from "../../../messages/en.json";

vi.mock(import("react-player"), () => ({
  default: () => createElement("span", { "data-testid": "mock-react-player" }),
}));

import { YouTubePlayer } from "./you-tube-player";

type PlayerProps = ComponentProps<typeof YouTubePlayer>;

const renderPlayer = (props: PlayerProps) =>
  render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <YouTubePlayer {...props} />
    </NextIntlClientProvider>,
  );

test("displays loading state initially", () => {
  renderPlayer({ youtubeVideoId: "test-video-id" });

  // oxlint-disable-next-line typescript/no-unsafe-call
  expect(screen.getByText(messages.player.loadingAudio)).toBeInTheDocument();
});

test("displays error state when video ID is empty", () => {
  renderPlayer({ youtubeVideoId: "" });

  // oxlint-disable-next-line typescript/no-unsafe-call
  expect(screen.getByText(messages.player.videoUnavailable)).toBeInTheDocument();
});

test("displays error state when video ID is undefined", () => {
  // oxlint-disable-next-line typescript/consistent-type-assertions, typescript/no-unsafe-type-assertion
  renderPlayer({ youtubeVideoId: undefined as unknown as string });

  // oxlint-disable-next-line typescript/no-unsafe-call
  expect(screen.getByText(messages.player.videoUnavailable)).toBeInTheDocument();
});

test("applies custom className", () => {
  renderPlayer({ className: "custom-class", youtubeVideoId: "test-video-id" });

  const container = screen.getByText(messages.player.loadingAudio).closest("div");
  // oxlint-disable-next-line typescript/no-unsafe-call
  expect(container?.parentElement).toHaveClass("custom-class");
});

test("contains hidden YouTube iframe container", () => {
  renderPlayer({ youtubeVideoId: "test-video-id" });

  const hiddenContainer = screen.getByTestId("hidden-youtube-player");
  // oxlint-disable-next-line typescript/no-unsafe-call
  expect(hiddenContainer).toHaveClass("w-[1px] h-[1px] -translate-x-full -translate-y-full");
});

test("error state has correct styling", () => {
  renderPlayer({ youtubeVideoId: "" });

  const errorContainer = screen.getByText(messages.player.videoUnavailable).closest("div");
  // oxlint-disable-next-line typescript/no-unsafe-call
  expect(errorContainer).toHaveClass("text-destructive");
  // oxlint-disable-next-line typescript/no-unsafe-call
  expect(errorContainer).toHaveClass("flex");
  // oxlint-disable-next-line typescript/no-unsafe-call
  expect(errorContainer).toHaveClass("items-center");
  // oxlint-disable-next-line typescript/no-unsafe-call
  expect(errorContainer).toHaveClass("gap-2");
});

test("error state contains alert icon", () => {
  renderPlayer({ youtubeVideoId: "" });

  const alertIcon = screen.getByTestId("alert-icon");
  // oxlint-disable-next-line typescript/no-unsafe-call
  expect(alertIcon).toBeInTheDocument();
});
