"use client";

import { AlertTriangle, Pause, Play } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface YouTubePlayerProps {
  youtubeVideoId: string;
  className?: string;
}

declare global {
  interface Window {
    YT: {
      Player: new (
        element: HTMLElement,
        config: {
          videoId: string;
          playerVars?: Record<string, number | string>;
          events?: {
            onReady?: () => void;
            onStateChange?: (event: { data: number }) => void;
            onError?: () => void;
          };
        },
      ) => {
        playVideo: () => void;
        pauseVideo: () => void;
        destroy: () => void;
      };
      PlayerState: {
        PLAYING: number;
        PAUSED: number;
        ENDED: number;
      };
    };
    onYouTubeIframeAPIReady: () => void;
  }
}

export function YouTubePlayer({ youtubeVideoId, className }: YouTubePlayerProps): React.ReactNode {
  const [isReady, setIsReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const playerRef = useRef<HTMLDivElement>(null);
  const ytPlayerRef = useRef<{
    playVideo: () => void;
    pauseVideo: () => void;
    destroy: () => void;
  } | null>(null);

  useEffect(() => {
    if (!youtubeVideoId) {
      setHasError(true);
      setIsLoading(false);
      return;
    }

    const loadYouTubeAPI = (): Promise<void> => {
      return new Promise((resolve) => {
        if (window.YT?.Player) {
          resolve();
          return;
        }

        const existingScript = document.querySelector(
          'script[src="https://www.youtube.com/iframe_api"]',
        );
        if (existingScript) {
          if (window.YT?.Player) {
            resolve();
          }
          return;
        }

        const tag = document.createElement("script");
        tag.src = "https://www.youtube.com/iframe_api";
        const firstScriptTag = document.getElementsByTagName("script")[0];
        firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);

        window.onYouTubeIframeAPIReady = () => {
          resolve();
        };
      });
    };

    loadYouTubeAPI().then(() => {
      if (playerRef.current && !ytPlayerRef.current && window.YT) {
        ytPlayerRef.current = new window.YT.Player(playerRef.current, {
          videoId: youtubeVideoId,
          playerVars: {
            autoplay: 0,
            controls: 0,
            disablekb: 1,
            modestbranding: 1,
            rel: 0,
            showinfo: 0,
            fs: 0,
            playsinline: 1,
          },
          events: {
            onReady: () => {
              setIsReady(true);
              setIsLoading(false);
            },
            onStateChange: (event: { data: number }) => {
              if (event.data === 1) {
                setIsPlaying(true);
                setHasError(false);
              } else if (event.data === 2) {
                setIsPlaying(false);
              } else if (event.data === 0) {
                setIsPlaying(false);
              }
            },
            onError: () => {
              setHasError(true);
              setIsPlaying(false);
              setIsLoading(false);
            },
          },
        });
      }
    });

    return () => {
      if (ytPlayerRef.current) {
        ytPlayerRef.current.destroy();
        ytPlayerRef.current = null;
      }
    };
  }, [youtubeVideoId]);

  const handlePlayPause = (): void => {
    if (!ytPlayerRef.current || !isReady) return;

    if (isPlaying) {
      ytPlayerRef.current.pauseVideo();
    } else {
      ytPlayerRef.current.playVideo();
    }
  };

  if (hasError) {
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
        <div ref={playerRef} className="w-[1px] h-[1px]" />
      </div>

      <div className="flex items-center gap-2">
        <Button
          type="button"
          size="icon-xs"
          variant="outline"
          onClick={handlePlayPause}
          disabled={!isReady || isLoading}
          className="shrink-0"
          aria-label={isPlaying ? "Pause audio" : "Play audio"}
        >
          {isPlaying ? (
            <Pause className="h-3 w-3" aria-hidden="true" data-testid="pause-icon" />
          ) : (
            <Play className="h-3 w-3" aria-hidden="true" data-testid="play-icon" />
          )}
        </Button>
        {isLoading && <span className="text-xs text-muted-foreground">Loading audio...</span>}
        {isReady && !isLoading && (
          <span
            className={cn(
              "text-xs font-medium",
              isPlaying ? "text-green-600 dark:text-green-400" : "text-muted-foreground",
            )}
          >
            {isPlaying ? "Playing" : "Paused"}
          </span>
        )}
      </div>
    </div>
  );
}
