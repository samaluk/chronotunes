"use client";

import { useTranslations } from "next-intl";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";

interface SettingSliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: <K extends keyof LobbySettings>(key: K, value: LobbySettings[K]) => void;
  onCommit: <K extends keyof LobbySettings>(key: K, value: LobbySettings[K]) => void;
  unit: string;
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
  const unitLabel =
    label === "turnSeconds"
      ? t("turnSeconds", { count: value })
      : label === "targetCards"
        ? t("targetCards", { count: value })
        : label === "bettingWindowSeconds"
          ? t("bettingWindowSeconds", { count: value })
          : `${value} ${unit}`;
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <Label htmlFor={sliderId} className="cursor-pointer whitespace-nowrap">
          {["turnSeconds", "targetCards", "bettingWindowSeconds"].includes(label)
            ? t(label, { count: value })
            : t(label)}
        </Label>
        <span className="text-muted-foreground whitespace-nowrap">{unitLabel}</span>
      </div>
      <Slider
        id={sliderId}
        min={min}
        max={max}
        step={step}
        value={value}
        onValueChange={(val) => onChange(label as keyof LobbySettings, Number(val))}
        onValueCommitted={(val) => onCommit(label as keyof LobbySettings, Number(val))}
        className="w-full h-2 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary"
      />
    </div>
  );
}
