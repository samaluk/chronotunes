"use client"

import { AlertTriangle, Loader2 } from "lucide-react"
import { useTranslations } from "next-intl"
import { useCallback, useEffect, useMemo, useState } from "react"
import ReactPlayer from "react-player"
import type { Config } from "react-player/types"
import { useIsMounted, useLocalStorage } from "usehooks-ts"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface YouTubePlayerProps {
  youtubeVideoId: string
  className?: string
}

const VOLUME_STORAGE_KEY = "chronotunes-volume"
const MUTED_STORAGE_KEY = "chronotunes-muted"
const MOBILE_BREAKPOINT = 768

type PlayerStatus = "loading" | "playing" | "error"

export function YouTubePlayer({ youtubeVideoId, className }: YouTubePlayerProps): React.ReactNode {
  const isMounted = useIsMounted()
  const tPlayer = useTranslations("player")
  const [status, setStatus] = useState<PlayerStatus>("loading")
  const [volume, _setVolume] = useLocalStorage(VOLUME_STORAGE_KEY, 80)
  const [isMuted, _setIsMuted] = useLocalStorage(MUTED_STORAGE_KEY, false)
  const [isMobile, setIsMobile] = useState(false)
  const [hasUserInitiated, setHasUserInitiated] = useState(false)

  const playerConfig: Config = useMemo(
    () => ({
      youtube: {
        autoplay: 1,
        controls: 0,
        disablekb: 1,
        modestbranding: 1,
        rel: 0,
        fs: 0,
        playsinline: 1,
      },
      file: { attributes: { disablepictureinpicture: "true" } },
    }),
    [],
  )

  useEffect(() => {
    if (!isMounted()) {
      return
    }

    if (!youtubeVideoId) {
      setStatus("error")
      return
    }

    setStatus("loading")
  }, [isMounted, youtubeVideoId])

  useEffect(() => {
    if (!isMounted()) {
      return
    }

    const mediaQuery = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    const updateMobileState = () => {
      const matches = mediaQuery.matches
      setIsMobile(matches)
      if (!matches) {
        setHasUserInitiated(true)
      }
    }

    updateMobileState()
    mediaQuery.addEventListener("change", updateMobileState)
    return () => mediaQuery.removeEventListener("change", updateMobileState)
  }, [isMounted])

  const handleEnableAudio = useCallback(() => {
    setHasUserInitiated(true)
  }, [])

  if (status === "error" || !youtubeVideoId) {
    return (
      <div
        className={cn(
          "flex items-center justify-center rounded-lg border border-destructive/20 bg-destructive/10 p-4",
          className,
        )}
      >
        <div className="flex items-center gap-2 text-destructive">
          <AlertTriangle className="h-5 w-5" data-testid="alert-icon" />
          <span className="font-medium text-sm">{tPlayer("videoUnavailable")}</span>
        </div>
      </div>
    )
  }

  let statusLabel = tPlayer("loadingAudio")
  let statusTone = "text-muted-foreground"
  let statusIndicator = <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />

  if (status === "playing") {
    statusLabel = tPlayer("playingAudio")
    statusTone = "text-green-600 dark:text-green-400"
    statusIndicator = <span className="h-2 w-2 animate-pulse rounded-full bg-green-500" />
  }

  if (isMobile && !hasUserInitiated) {
    statusLabel = tPlayer("tapToEnableAudio")
    statusTone = "text-amber-600 dark:text-amber-400"
    statusIndicator = <span className="h-2 w-2 animate-pulse rounded-full bg-amber-500" />
  }

  const isEffectivelyMuted = isMuted || (isMobile && !hasUserInitiated)

  return (
    <div className={cn("relative", className)}>
      <div
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute inset-0 overflow-hidden",
          "h-[1px] w-[1px] -translate-x-full -translate-y-full",
        )}
        data-testid="hidden-youtube-player"
      >
        <ReactPlayer
          config={playerConfig}
          controls={false}
          height="1px"
          key={youtubeVideoId}
          muted={isEffectivelyMuted}
          onError={() => setStatus("error")}
          onPlay={() => setStatus("playing")}
          onReady={() => setStatus((previous) => (previous === "playing" ? previous : "loading"))}
          onStart={() => setStatus("playing")}
          playing={isMobile ? hasUserInitiated : true}
          src={`https://www.youtube.com/watch?v=${youtubeVideoId}`}
          volume={isEffectivelyMuted ? 0 : volume / 100}
          width="1px"
        />
      </div>

      <div className="flex items-center gap-2">
        {statusIndicator}
        <output aria-live="polite" className={cn("font-medium text-xs", statusTone)}>
          {statusLabel}
        </output>
        {isMobile && !hasUserInitiated && (
          <Button
            className="ml-2"
            onClick={handleEnableAudio}
            size="xs"
            type="button"
            variant="outline"
          >
            {tPlayer("tapToEnableAudio")}
          </Button>
        )}
      </div>
    </div>
  )
}
