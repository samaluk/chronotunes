"use client";

import { Volume2, VolumeX } from "lucide-react";
import { useLocalStorage } from "usehooks-ts";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";

const VOLUME_STORAGE_KEY = "chronotunes-volume";
const MUTED_STORAGE_KEY = "chronotunes-muted";

interface VolumeSliderProps {
  className?: string;
}

export function VolumeSlider({ className }: VolumeSliderProps): React.ReactNode {
  const [volume, setVolume] = useLocalStorage(VOLUME_STORAGE_KEY, 80);
  const [isMuted, setIsMuted] = useLocalStorage(MUTED_STORAGE_KEY, false);

  const handleVolumeChange = (value: number): void => {
    const newVolume = value;
    setVolume(newVolume);
    setIsMuted(newVolume === 0);
  };

  const toggleMute = (): void => {
    setIsMuted(!isMuted);
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Button
        aria-label={isMuted ? "Unmute" : "Mute"}
        className="shrink-0 p-1.5"
        onClick={toggleMute}
        size={"icon-lg"}
        type="button"
        variant={"ghost"}
      >
        {isMuted ? (
          <VolumeX className="h-4 w-4 text-muted-foreground" />
        ) : (
          <Volume2 className="h-4 w-4 text-foreground" />
        )}
      </Button>

      <Slider
        aria-label="Volume"
        className="h-2 w-28"
        max={100}
        min={0}
        onValueChange={(value: number | readonly number[]) => handleVolumeChange(value as number)}
        value={isMuted ? 0 : volume}
      />
    </div>
  );
}
