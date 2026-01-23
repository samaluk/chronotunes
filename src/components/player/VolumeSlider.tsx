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
        type="button"
        onClick={toggleMute}
        className="shrink-0 p-1.5"
        variant={"ghost"}
        size={"icon-lg"}
        aria-label={isMuted ? "Unmute" : "Mute"}
      >
        {isMuted ? (
          <VolumeX className="h-4 w-4 text-muted-foreground" />
        ) : (
          <Volume2 className="h-4 w-4 text-foreground" />
        )}
      </Button>

      <Slider
        min={0}
        max={100}
        value={isMuted ? 0 : volume}
        onValueChange={(value: number | readonly number[]) => handleVolumeChange(value as number)}
        className="w-28 h-2"
        aria-label="Volume"
      />
    </div>
  );
}
