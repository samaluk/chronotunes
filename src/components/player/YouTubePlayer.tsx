"use client";

import { AlertTriangle } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import ReactPlayer from "react-player";
import type { Config } from "react-player/types";
import { useLocalStorage } from "usehooks-ts";
import { useMounted } from "@/lib/hooks/useMounted";
import { cn } from "@/lib/utils";

interface YouTubePlayerProps {
  youtubeVideoId: string;
  className?: string;
}

const VOLUME_STORAGE_KEY = "chronotunes-volume";
const MUTED_STORAGE_KEY = "chronotunes-muted";

export function YouTubePlayer({ youtubeVideoId, className }: YouTubePlayerProps): React.ReactNode {
  const mounted = useMounted();
  const [isReady, setIsReady] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [volume, _setVolume] = useLocalStorage(VOLUME_STORAGE_KEY, 80);
  const [isMuted, _setIsMuted] = useLocalStorage(MUTED_STORAGE_KEY, false);

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
  );

  useEffect(() => {
    if (!mounted || !youtubeVideoId) {
      setHasError(!mounted || !youtubeVideoId);
      setIsLoading(false);
      return;
    }

    setHasError(false);
    setIsReady(false);
    setIsLoading(true);
  }, [mounted, youtubeVideoId]);

  if (hasError || !youtubeVideoId) {
    return (
      <div
        className={cn(
          "flex items-center justify-center p-4 rounded-lg bg-destructive/10 border border-destructive/20",
          className,
        )}
      >
        <div className="flex items-center gap-2 text-destructive">
          <AlertTriangle className="h-5 w-5" data-testid="alert-icon" />
          <span className="text-sm font-medium">Video unavailable</span>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("relative", className)}>
      <div
        className={cn(
          "absolute inset-0 pointer-events-none overflow-hidden",
          "w-[1px] h-[1px] -translate-x-full -translate-y-full",
        )}
        aria-hidden="true"
        data-testid="hidden-youtube-player"
      >
        <ReactPlayer
          key={youtubeVideoId}
          src={`https://www.youtube.com/watch?v=${youtubeVideoId}`}
          playing={true}
          controls={false}
          width="1px"
          height="1px"
          volume={isMuted ? 0 : volume / 100}
          muted={isMuted}
          onReady={() => {
            setIsReady(true);
            setIsLoading(false);
          }}
          onError={() => {
            setHasError(true);
            setIsLoading(false);
          }}
          config={playerConfig}
        />
      </div>

      <div className="flex items-center gap-3">
        {isLoading ? (
          <span className="text-xs text-muted-foreground">Loading...</span>
        ) : (
          <span className="text-xs text-green-600 dark:text-green-400 font-medium">
            {isReady ? "Playing" : "Ready"}
          </span>
        )}
      </div>
    </div>
  );
}
