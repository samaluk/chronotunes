"use client";

import { useTranslations } from "next-intl";

import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";

interface SettingRangeProps {
  label: string;
  maxRange: number;
  maxValue: number;
  minRange: number;
  minValue: number;
  onMaxChange: <K extends keyof LobbySettings>(
    key: K,
    value: LobbySettings[K]
  ) => void;
  onMaxCommit: <K extends keyof LobbySettings>(
    key: K,
    value: LobbySettings[K]
  ) => void;
  onMinChange: <K extends keyof LobbySettings>(
    key: K,
    value: LobbySettings[K]
  ) => void;
  onMinCommit: <K extends keyof LobbySettings>(
    key: K,
    value: LobbySettings[K]
  ) => void;
}

interface LobbySettings {
  allowBetRetraction: boolean;
  allowGuessTitleArtist: boolean;
  bettingWindowSeconds: number;
  maxYear: number;
  minYear: number;
  showLiveBets: boolean;
  startingCoins: number;
  targetTimelineSize: number;
  turnSeconds: number;
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
  const minInputId = `min-${label.replaceAll(/\s+/g, "-").toLowerCase()}`;
  const maxInputId = `max-${label.replaceAll(/\s+/g, "-").toLowerCase()}`;
  const sliderId = `${minInputId}-slider-${maxInputId}`;
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <Label className="cursor-pointer" htmlFor={sliderId}>
          {t(label)}
        </Label>
        <span className="text-muted-foreground">
          {t("yearRangeValue", { max: maxValue, min: minValue })}
        </span>
      </div>
      <div className="flex items-center gap-4">
        <Slider
          className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-secondary accent-primary"
          id={sliderId}
          max={maxRange}
          min={minRange}
          onValueChange={(val) => {
            const values = Array.isArray(val) ? val : [val, val];
            const sortedValues = [...values].toSorted((a, b) => a - b);
            onMinChange("minYear", sortedValues[0]);
            onMaxChange("maxYear", sortedValues[1]);
          }}
          onValueCommitted={(val) => {
            const values = Array.isArray(val) ? val : [val, val];
            const sortedValues = [...values].toSorted((a, b) => a - b);
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
