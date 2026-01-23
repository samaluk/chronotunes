"use client"

import { useTranslations } from "next-intl"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"

interface SettingSliderProps {
  label: string
  value: number
  min: number
  max: number
  step: number
  onChange: <K extends keyof LobbySettings>(key: K, value: LobbySettings[K]) => void
  onCommit: <K extends keyof LobbySettings>(key: K, value: LobbySettings[K]) => void
  unit: string
}

interface LobbySettings {
  targetTimelineSize: number
  startingCoins: number
  turnSeconds: number
  bettingWindowSeconds: number
  allowGuessTitleArtist: boolean
  showLiveBets: boolean
  allowBetRetraction: boolean
  minYear: number
  maxYear: number
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
  const t = useTranslations("settings")
  const sliderId = `slider-${label}`
  const unitLabel =
    label === "turnSeconds"
      ? t("turnSeconds", { count: value })
      : label === "targetCards"
        ? t("targetCards", { count: value })
        : label === "bettingWindowSeconds"
          ? t("bettingWindowSeconds", { count: value })
          : `${value} ${unit}`
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
        onValueChange={(val) => onChange(label as keyof LobbySettings, Number(val))}
        onValueCommitted={(val) => onCommit(label as keyof LobbySettings, Number(val))}
        step={step}
        value={value}
      />
    </div>
  )
}
