"use client";

import { useMutation } from "convex/react";
import { useSessionId } from "convex-helpers/react/sessions";
import { Check, ChevronDown, ChevronUp, Settings2, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Slider } from "@/components/ui/slider";
import { api } from "@/convex/_generated/api.js";

interface SettingsPanelProps {
  code: string;
  isHost: boolean;
  currentSettings: {
    targetTimelineSize: number;
    startingCoins: number;
    turnSeconds: number;
    bettingWindowSeconds: number;
    allowGuessTitleArtist: boolean;
    showLiveBets: boolean;
    allowBetRetraction: boolean;
    minYear: number;
    maxYear: number;
  };
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

export function SettingsPanel({ code, isHost, currentSettings }: SettingsPanelProps) {
  const t = useTranslations("settings");
  const _tCommon = useTranslations("common");

  const [sessionId] = useSessionId();
  const [isExpanded, setIsExpanded] = useState(false);
  const [optimisticSettings, setOptimisticSettings] = useState(currentSettings);

  useEffect(() => {
    setOptimisticSettings(currentSettings);
  }, [currentSettings]);

  const updateSettings = useMutation(api.lobbies.updateSettings);

  const handleSettingChange = <K extends keyof LobbySettings>(
    key: K,
    value: LobbySettings[K],
  ): void => {
    setOptimisticSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleCommit = async <K extends keyof LobbySettings>(
    key: K,
    value: LobbySettings[K],
  ): Promise<void> => {
    if (!sessionId) return;
    try {
      await updateSettings({ code, settings: { [key]: value }, sessionId });
    } catch (error) {
      const message = error instanceof Error ? error.message : t("failedToSave");
      toast.error(message);
      setOptimisticSettings(currentSettings);
    }
  };

  if (!isHost) {
    return (
      <div className="space-y-3">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Settings2 className="h-5 w-5" />
          {t("title")}
        </h3>
        <div className="p-4 rounded-lg bg-muted text-sm space-y-2">
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t("targetTimelineSize")}</span>
            <span className="font-medium">
              {t("targetCards", { count: optimisticSettings.targetTimelineSize })}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t("startingCoins")}</span>
            <span className="font-medium">{optimisticSettings.startingCoins}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t("turnDuration")}</span>
            <span className="font-medium">
              {t("turnSeconds", { count: optimisticSettings.turnSeconds })}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t("bettingWindow")}</span>
            <span className="font-medium">
              {t("bettingWindowSeconds", { count: optimisticSettings.bettingWindowSeconds })}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t("yearRange")}</span>
            <span className="font-medium">
              {t("yearRangeValue", {
                min: optimisticSettings.minYear,
                max: optimisticSettings.maxYear,
              })}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t("allowGuessTitleArtist")}</span>
            <span className="font-medium">
              {optimisticSettings.allowGuessTitleArtist ? <Check /> : <X />}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t("showLiveBets")}</span>
            <span className="font-medium">
              {optimisticSettings.showLiveBets ? <Check /> : <X />}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t("allowBetRetraction")}</span>
            <span className="font-medium">
              {optimisticSettings.allowBetRetraction ? <Check /> : <X />}
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-3 rounded-lg bg-card border transition-colors hover:bg-accent"
      >
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Settings2 className="h-5 w-5" />
          {t("title")}
        </h3>
        {isExpanded ? (
          <ChevronUp className="h-5 w-5 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-5 w-5 text-muted-foreground" />
        )}
      </button>

      {isExpanded && (
        <div className="p-4 rounded-lg bg-card border space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <SettingSlider
              label="targetTimelineSize"
              value={optimisticSettings.targetTimelineSize}
              min={5}
              max={15}
              step={1}
              onChange={handleSettingChange}
              onCommit={handleCommit}
              unit="cards"
            />

            <SettingSlider
              label="startingCoins"
              value={optimisticSettings.startingCoins}
              min={1}
              max={10}
              step={1}
              onChange={handleSettingChange}
              onCommit={handleCommit}
              unit="coins"
            />

            <SettingSlider
              label="turnSeconds"
              value={optimisticSettings.turnSeconds}
              min={15}
              max={120}
              step={5}
              onChange={handleSettingChange}
              onCommit={handleCommit}
              unit="seconds"
            />

            <SettingSlider
              label="bettingWindowSeconds"
              value={optimisticSettings.bettingWindowSeconds}
              min={5}
              max={60}
              step={5}
              onChange={handleSettingChange}
              onCommit={handleCommit}
              unit="seconds"
            />

            <div className="sm:col-span-2">
              <SettingRange
                label="yearRange"
                minValue={optimisticSettings.minYear}
                maxValue={optimisticSettings.maxYear}
                minRange={1950}
                maxRange={2025}
                onMinChange={handleSettingChange}
                onMaxChange={handleSettingChange}
                onMinCommit={handleCommit}
                onMaxCommit={handleCommit}
              />
            </div>
          </div>

          <div className="space-y-3 pt-2 border-t">
            <ToggleSetting
              label={t("allowGuessTitleArtist")}
              description={t("allowGuessTitleArtistDesc")}
              enabled={optimisticSettings.allowGuessTitleArtist}
              onChange={(value) => {
                handleSettingChange("allowGuessTitleArtist", value);
                handleCommit("allowGuessTitleArtist", value);
              }}
            />

            <ToggleSetting
              label={t("showLiveBets")}
              description={t("showLiveBetsDesc")}
              enabled={optimisticSettings.showLiveBets}
              onChange={(value) => {
                handleSettingChange("showLiveBets", value);
                handleCommit("showLiveBets", value);
              }}
            />

            <ToggleSetting
              label={t("allowBetRetraction")}
              description={t("allowBetRetractionDesc")}
              enabled={optimisticSettings.allowBetRetraction}
              onChange={(value) => {
                handleSettingChange("allowBetRetraction", value);
                handleCommit("allowBetRetraction", value);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

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

function SettingSlider({
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
        <label htmlFor={sliderId} className="font-medium cursor-pointer whitespace-nowrap">
          {["turnSeconds", "targetCards", "bettingWindowSeconds"].includes(label)
            ? t(label, { count: value })
            : t(label)}
        </label>
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

function SettingRange({
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
        <label htmlFor={minInputId} className="font-medium cursor-pointer">
          {t(label)}
        </label>
        <span className="text-muted-foreground">
          {t("yearRangeValue", { min: minValue, max: maxValue })}
        </span>
      </div>
      <div className="flex items-center gap-4">
        {/* <input
          id={minInputId}
          type="number"
          min={minRange}
          max={maxValue - 1}
          value={minValue}
          onChange={(e) =>
            onMinChange(
              label as keyof LobbySettings,
              Math.min(Number(e.target.value), maxValue - 1),
            )
          }
          className="w-20 h-9 px-3 rounded-md border border-input bg-background text-sm"
        />
        <span className="text-muted-foreground">-</span>
        <input
          id={maxInputId}
          type="number"
          min={minValue + 1}
          max={maxRange}
          value={maxValue}
          onChange={(e) =>
            onMaxChange(
              label as keyof LobbySettings,
              Math.max(Number(e.target.value), minValue + 1),
            )
          }
          className="w-20 h-9 px-3 rounded-md border border-input bg-background text-sm"
        /> */}

        <Slider
          id={`${minInputId}-slider-${maxInputId}`}
          min={minRange}
          max={maxRange}
          step={1}
          value={[minValue, maxValue]}
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
          className="w-full h-2 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary"
        />
      </div>
    </div>
  );
}

interface ToggleSettingProps {
  label: string;
  description: string;
  enabled: boolean;
  onChange: (value: boolean) => void;
}

function ToggleSetting({
  label,
  description,
  enabled,
  onChange,
}: ToggleSettingProps): React.ReactNode {
  const toggleId = `toggle-${label.replace(/\s+/g, "-").toLowerCase()}`;
  return (
    <div className="flex items-center justify-between">
      <div className="space-y-0.5">
        <label htmlFor={toggleId} className="text-sm font-medium cursor-pointer">
          {label}
        </label>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <input
        id={toggleId}
        type="checkbox"
        checked={enabled}
        onChange={(e) => onChange(e.target.checked)}
        className="sr-only"
      />
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        onClick={() => onChange(!enabled)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
          enabled ? "bg-primary" : "bg-secondary"
        }`}
        aria-label={label}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            enabled ? "translate-x-6" : "translate-x-1"
          }`}
        />
      </button>
    </div>
  );
}
