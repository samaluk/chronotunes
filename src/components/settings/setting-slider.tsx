"use client";

import { useTranslations } from "next-intl";

import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";

interface SettingSliderProps {
  label: string;
  max: number;
  min: number;
  onChange: <K extends keyof LobbySettings>(key: K, value: LobbySettings[K]) => void;
  onCommit: <K extends keyof LobbySettings>(key: K, value: LobbySettings[K]) => void;
  step: number;
  unit: string;
  value: number;
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

const getUnitLabel = (
  label: string,
  value: number,
  unit: string,
  t: ReturnType<typeof useTranslations>,
): string => {
  switch (label) {
    case "turnSeconds": {
      return t("turnSeconds", { count: value });
    }
    case "targetCards": {
      return t("targetCards", { count: value });
    }
    case "bettingWindowSeconds": {
      return t("bettingWindowSeconds", { count: value });
    }
    default: {
      return `${value} ${unit}`;
    }
  }
};

export function SettingSlider({
  label,
  value,
  min,
  max,
  step,
  onChange,
  onCommit,
  unit,
}: SettingSliderProps): React.ReactNode {
  const t = useTranslations("settings");
  const sliderId = `slider-${label}`;
  const unitLabel = getUnitLabel(label, value, unit, t);
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <Label className="cursor-pointer whitespace-nowrap" htmlFor={sliderId}>
          {["turnSeconds", "targetCards", "bettingWindowSeconds"].includes(label)
            ? t(label, { count: value })
            : t(label)}
        </Label>
        <span className="whitespace-nowrap text-muted-foreground">{unitLabel}</span>
      </div>
      <Slider
        className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-secondary accent-primary"
        id={sliderId}
        max={max}
        min={min}
        onValueChange={
          /* oxlint-disable typescript/consistent-type-assertions, typescript/no-unsafe-type-assertion */
          (val) => onChange(label as keyof LobbySettings, Number(val))
          /* oxlint-enable typescript/consistent-type-assertions, typescript/no-unsafe-type-assertion */
        }
        onValueCommitted={
          /* oxlint-disable typescript/consistent-type-assertions, typescript/no-unsafe-type-assertion */
          (val) => onCommit(label as keyof LobbySettings, Number(val))
          /* oxlint-enable typescript/consistent-type-assertions, typescript/no-unsafe-type-assertion */
        }
        step={step}
        value={value}
      />
    </div>
  );
}
