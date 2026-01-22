"use client";

import { AlertTriangle, Volume2, VolumeX } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import ReactPlayer from "react-player";
import type { Config } from "react-player/types";
import { cn } from "@/lib/utils";

interface YouTubePlayerProps {
  youtubeVideoId: string;
  className?: string;
}

export function YouTubePlayer({ youtubeVideoId, className }: YouTubePlayerProps): React.ReactNode {
  const [isReady, setIsReady] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [volume, setVolume] = useState(80);
  const [isMuted, setIsMuted] = useState(false);

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
      file: { attributes: { disablepictureinpicture: 'true' } }
    }),
    [],
  );

  useEffect(() => {
    if (!youtubeVideoId) {
      setHasError(true);
      setIsLoading(false);
      return;
    }

    setHasError(false);
    setIsReady(false);
    setIsLoading(true);
  }, [youtubeVideoId]);

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const newVolume = Number(e.target.value);
    setVolume(newVolume);
    setIsMuted(newVolume === 0);
  };

  const toggleMute = (): void => {
    setIsMuted((prev) => !prev);
  };

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
        <button
          type="button"
          onClick={toggleMute}
          className="shrink-0 p-2 rounded-md hover:bg-muted transition-colors"
          aria-label={isMuted ? "Unmute" : "Mute"}
        >
          {isMuted ? (
            <VolumeX className="h-4 w-4 text-muted-foreground" />
          ) : (
            <Volume2 className="h-4 w-4 text-foreground" />
          )}
        </button>

        <input
          type="range"
          min="0"
          max="100"
          value={isMuted ? 0 : volume}
          onChange={handleVolumeChange}
          className="flex-1 h-2 bg-muted rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary"
          aria-label="Volume"
        />

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
