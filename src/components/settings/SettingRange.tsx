"use client";

import { useTranslations } from "next-intl";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";

interface SettingRangeProps {
  label: string;
  minValue: number;
  maxValue: number;
  minRange: number;
  maxRange: number;
  onMinChange: <K extends keyof LobbySettings>(key: K, value: LobbySettings[K]) => void;
  onMaxChange: <K extends keyof LobbySettings>(key: K, value: LobbySettings[K]) => void;
  onMinCommit: <K extends keyof LobbySettings>(key: K, value: LobbySettings[K]) => void;
  onMaxCommit: <K extends keyof LobbySettings>(key: K, value: LobbySettings[K]) => void;
}

interface LobbySettings {
  targetTimelineSize: number;
  startingCoins: number;
  turnSeconds: number;
  bettingWindowSeconds: number;
  allowGuessTitleArtist: boolean;
  showLiveBets: boolean;
  allowBetRetraction: boolean;
  minYear: number;
  maxYear: number;
}

export function SettingRange({
  label,
  minValue,
  maxValue,
  minRange,
  maxRange,
  onMinChange,
  onMaxChange,
  onMinCommit,
  onMaxCommit,
}: SettingRangeProps): React.ReactNode {
  const t = useTranslations("settings");
  const minInputId = `min-${label.replace(/\s+/g, "-").toLowerCase()}`;
  const maxInputId = `max-${label.replace(/\s+/g, "-").toLowerCase()}`;
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <Label className="cursor-pointer" htmlFor={minInputId}>
          {t(label)}
        </Label>
        <span className="text-muted-foreground">
          {t("yearRangeValue", { min: minValue, max: maxValue })}
        </span>
      </div>
      <div className="flex items-center gap-4">
        <Slider
          className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-secondary accent-primary"
          id={`${minInputId}-slider-${maxInputId}`}
          max={maxRange}
          min={minRange}
          onValueChange={(val) => {
            const values = Array.isArray(val) ? val : [val, val];
            const sortedValues = [...values].sort((a, b) => a - b);
            onMinChange("minYear", sortedValues[0]);
            onMaxChange("maxYear", sortedValues[1]);
          }}
          onValueCommitted={(val) => {
            const values = Array.isArray(val) ? val : [val, val];
            const sortedValues = [...values].sort((a, b) => a - b);
            onMinCommit("minYear", sortedValues[0]);
            onMaxCommit("maxYear", sortedValues[1]);
          }}
          step={1}
          value={[minValue, maxValue]}
        />
      </div>
    </div>
  );
}
