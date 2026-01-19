import { render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import { YouTubePlayer } from "./YouTubePlayer";

global.window.YT = {
  Player: vi.fn().mockImplementation(() => ({
    playVideo: vi.fn(),
    pauseVideo: vi.fn(),
    destroy: vi.fn(),
  })),
  PlayerState: {
    PLAYING: 1,
    PAUSED: 2,
    ENDED: 0,
  },
} as unknown as typeof window.YT;

test("renders with play button initially", () => {
  render(<YouTubePlayer youtubeVideoId="test-video-id" />);

  expect(screen.getByRole("button", { name: "Play audio" })).toBeInTheDocument();
});

test("displays loading state initially", () => {
  render(<YouTubePlayer youtubeVideoId="test-video-id" />);

  expect(screen.getByText("Loading audio...")).toBeInTheDocument();
});

test("displays error state when video ID is empty", () => {
  render(<YouTubePlayer youtubeVideoId="" />);

  expect(screen.getByText("Video unavailable")).toBeInTheDocument();
});

test("displays error state when video ID is undefined", () => {
  render(<YouTubePlayer youtubeVideoId={undefined as unknown as string} />);

  expect(screen.getByText("Video unavailable")).toBeInTheDocument();
});

test("play button is disabled while loading", () => {
  render(<YouTubePlayer youtubeVideoId="test-video-id" />);

  const button = screen.getByRole("button", { name: "Play audio" });
  expect(button).toBeDisabled();
});

test("applies custom className", () => {
  render(<YouTubePlayer youtubeVideoId="test-video-id" className="custom-class" />);

  const container = screen.getByText("Loading audio...").closest("div");
  expect(container?.parentElement).toHaveClass("custom-class");
});

test("contains hidden YouTube iframe container", () => {
  render(<YouTubePlayer youtubeVideoId="test-video-id" />);

  const hiddenContainer = screen.getByTestId("hidden-youtube-player");
  expect(hiddenContainer).toHaveClass("w-[1px] h-[1px] -translate-x-full -translate-y-full");
});

test("renders play icon when not playing", () => {
  render(<YouTubePlayer youtubeVideoId="test-video-id" />);

  const playIcon = screen.getByTestId("play-icon");
  expect(playIcon).toBeInTheDocument();
});

test("error state has correct styling", () => {
  render(<YouTubePlayer youtubeVideoId="" />);

  const errorContainer = screen.getByText("Video unavailable").closest("div");
  expect(errorContainer).toHaveClass("text-destructive");
  expect(errorContainer).toHaveClass("flex");
  expect(errorContainer).toHaveClass("items-center");
  expect(errorContainer).toHaveClass("gap-2");
});

test("error state contains alert icon", () => {
  render(<YouTubePlayer youtubeVideoId="" />);

  const alertIcon = screen.getByTestId("alert-icon");
  expect(alertIcon).toBeInTheDocument();
});
