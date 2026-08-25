"use client";

import { useTranslations } from "next-intl";

import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import type { LobbySettings } from "@/components/settings/lobby-settings";

export interface SettingRangeProps {
  label: string;
  maxRange: number;
  maxValue: number;
  minRange: number;
  minValue: number;
  onMaxChange: <K extends keyof LobbySettings>(key: K, value: LobbySettings[K]) => void;
  onMaxCommit: <K extends keyof LobbySettings>(key: K, value: LobbySettings[K]) => void;
  onMinChange: <K extends keyof LobbySettings>(key: K, value: LobbySettings[K]) => void;
  onMinCommit: <K extends keyof LobbySettings>(key: K, value: LobbySettings[K]) => void;
}

function getSortedRangeValues(value: number | readonly number[]): [number, number] {
  const values: readonly number[] = typeof value === "number" ? [value, value] : value;

  if (values.length !== 2 || values.some((item) => !Number.isFinite(item))) {
    throw new TypeError("Slider value must contain exactly two finite numbers");
  }

  const [first = Number.NaN, second = Number.NaN] = values.toSorted((a, b) => a - b);

  return [first, second];
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
            const [min, max] = getSortedRangeValues(val);
            onMinChange("minYear", min);
            onMaxChange("maxYear", max);
          }}
          onValueCommitted={(val) => {
            const [min, max] = getSortedRangeValues(val);
            onMinCommit("minYear", min);
            onMaxCommit("maxYear", max);
          }}
          step={1}
          value={[minValue, maxValue]}
        />
      </div>
    </div>
  );
}
