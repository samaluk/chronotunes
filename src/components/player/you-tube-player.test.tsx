import { render, screen } from "@testing-library/react"
import { NextIntlClientProvider } from "next-intl"
import { type ComponentProps, createElement } from "react"
import { expect, test, vi } from "vitest"
import messages from "../../../messages/en.json"

vi.mock("react-player", () => ({
  default: () => createElement("span", { "data-testid": "mock-react-player" }),
}))

import { YouTubePlayer } from "./you-tube-player"

type PlayerProps = ComponentProps<typeof YouTubePlayer>

const renderPlayer = (props: PlayerProps) => {
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <YouTubePlayer {...props} />
    </NextIntlClientProvider>,
  )
}

test("displays loading state initially", () => {
  renderPlayer({ youtubeVideoId: "test-video-id" })

  expect(screen.getByText(messages.player.loadingAudio)).toBeInTheDocument()
})

test("displays error state when video ID is empty", () => {
  renderPlayer({ youtubeVideoId: "" })

  expect(screen.getByText(messages.player.videoUnavailable)).toBeInTheDocument()
})

test("displays error state when video ID is undefined", () => {
  renderPlayer({ youtubeVideoId: undefined as unknown as string })

  expect(screen.getByText(messages.player.videoUnavailable)).toBeInTheDocument()
})

test("applies custom className", () => {
  renderPlayer({ youtubeVideoId: "test-video-id", className: "custom-class" })

  const container = screen.getByText(messages.player.loadingAudio).closest("div")
  expect(container?.parentElement).toHaveClass("custom-class")
})

test("contains hidden YouTube iframe container", () => {
  renderPlayer({ youtubeVideoId: "test-video-id" })

  const hiddenContainer = screen.getByTestId("hidden-youtube-player")
  expect(hiddenContainer).toHaveClass("w-[1px] h-[1px] -translate-x-full -translate-y-full")
})

test("error state has correct styling", () => {
  renderPlayer({ youtubeVideoId: "" })

  const errorContainer = screen.getByText(messages.player.videoUnavailable).closest("div")
  expect(errorContainer).toHaveClass("text-destructive")
  expect(errorContainer).toHaveClass("flex")
  expect(errorContainer).toHaveClass("items-center")
  expect(errorContainer).toHaveClass("gap-2")
})

test("error state contains alert icon", () => {
  renderPlayer({ youtubeVideoId: "" })

  const alertIcon = screen.getByTestId("alert-icon")
  expect(alertIcon).toBeInTheDocument()
})
