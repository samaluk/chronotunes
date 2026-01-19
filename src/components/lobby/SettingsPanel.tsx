"use client";

import { useMutation } from "convex/react";
import type { GenericId } from "convex/values";
import { ChevronDown, ChevronUp, Settings2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api.js";

interface SettingsPanelProps {
  lobbyId: GenericId<"lobbies">;
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

export function SettingsPanel({
  lobbyId,
  isHost,
  currentSettings,
}: SettingsPanelProps): React.ReactNode {
  const t = useTranslations("settings");
  const tCommon = useTranslations("common");

  const [isExpanded, setIsExpanded] = useState(false);
  const [settings, setSettings] = useState<LobbySettings>(currentSettings);
  const [hasChanges, setHasChanges] = useState(false);

  const updateSettings = useMutation(api.lobbies.updateSettings);

  const handleSettingChange = <K extends keyof LobbySettings>(
    key: K,
    value: LobbySettings[K],
  ): void => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const handleSave = async (): Promise<void> => {
    try {
      await updateSettings({
        lobbyId,
        settings: {
          targetTimelineSize: settings.targetTimelineSize,
          startingCoins: settings.startingCoins,
          turnSeconds: settings.turnSeconds,
          bettingWindowSeconds: settings.bettingWindowSeconds,
          allowGuessTitleArtist: settings.allowGuessTitleArtist,
          showLiveBets: settings.showLiveBets,
          allowBetRetraction: settings.allowBetRetraction,
          minYear: settings.minYear,
          maxYear: settings.maxYear,
        },
      });
      toast.success(t("settingsSaved"));
      setHasChanges(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : t("failedToSave");
      toast.error(message);
    }
  };

  const handleReset = (): void => {
    setSettings(currentSettings);
    setHasChanges(false);
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
              {t("targetCards", { count: currentSettings.targetTimelineSize })}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t("startingCoins")}</span>
            <span className="font-medium">{currentSettings.startingCoins}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t("turnDuration")}</span>
            <span className="font-medium">
              {t("turnSeconds", { count: currentSettings.turnSeconds })}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t("bettingWindow")}</span>
            <span className="font-medium">
              {t("bettingWindowSeconds", { count: currentSettings.bettingWindowSeconds })}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t("yearRange")}</span>
            <span className="font-medium">
              {t("yearRangeValue", { min: currentSettings.minYear, max: currentSettings.maxYear })}
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
              label={t("targetTimelineSize")}
              value={settings.targetTimelineSize}
              min={5}
              max={15}
              step={1}
              onChange={(value) => handleSettingChange("targetTimelineSize", value)}
              unit="cards"
              t={t}
            />

            <SettingSlider
              label={t("startingCoins")}
              value={settings.startingCoins}
              min={1}
              max={10}
              step={1}
              onChange={(value) => handleSettingChange("startingCoins", value)}
              unit="coins"
              t={t}
            />

            <SettingSlider
              label={t("turnDuration")}
              value={settings.turnSeconds}
              min={15}
              max={120}
              step={5}
              onChange={(value) => handleSettingChange("turnSeconds", value)}
              unit="seconds"
              t={t}
            />

            <SettingSlider
              label={t("bettingWindow")}
              value={settings.bettingWindowSeconds}
              min={5}
              max={60}
              step={5}
              onChange={(value) => handleSettingChange("bettingWindowSeconds", value)}
              unit="seconds"
              t={t}
            />

            <div className="sm:col-span-2">
              <SettingRange
                label={t("yearRange")}
                minValue={settings.minYear}
                maxValue={settings.maxYear}
                minRange={1950}
                maxRange={2025}
                onMinChange={(value) => handleSettingChange("minYear", value)}
                onMaxChange={(value) => handleSettingChange("maxYear", value)}
                t={t}
              />
            </div>
          </div>

          <div className="space-y-3 pt-2 border-t">
            <ToggleSetting
              label={t("allowGuessTitleArtist")}
              description={t("allowGuessTitleArtistDesc")}
              enabled={settings.allowGuessTitleArtist}
              onChange={(value) => handleSettingChange("allowGuessTitleArtist", value)}
            />

            <ToggleSetting
              label={t("showLiveBets")}
              description={t("showLiveBetsDesc")}
              enabled={settings.showLiveBets}
              onChange={(value) => handleSettingChange("showLiveBets", value)}
            />

            <ToggleSetting
              label={t("allowBetRetraction")}
              description={t("allowBetRetractionDesc")}
              enabled={settings.allowBetRetraction}
              onChange={(value) => handleSettingChange("allowBetRetraction", value)}
            />
          </div>

          {hasChanges && (
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={handleSave}
                className="flex-1 inline-flex items-center justify-center h-10 px-4 rounded-md bg-primary text-primary-foreground font-medium transition-colors hover:bg-primary/90"
              >
                {tCommon("saveChanges")}
              </button>
              <button
                type="button"
                onClick={handleReset}
                className="flex-1 inline-flex items-center justify-center h-10 px-4 rounded-md border border-input bg-background font-medium transition-colors hover:bg-accent"
              >
                {tCommon("cancel")}
              </button>
            </div>
          )}
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
  onChange: (value: number) => void;
  unit: string;
  t: ReturnType<typeof useTranslations>;
}

function SettingSlider({
  label,
  value,
  min,
  max,
  step,
  onChange,
  unit,
  t,
}: SettingSliderProps): React.ReactNode {
  const sliderId = `slider-${label.replace(/\s+/g, "-").toLowerCase()}`;
  const unitLabel =
    unit === "seconds"
      ? t("turnSeconds", { count: value })
      : unit === "cards"
        ? t("targetCards", { count: value })
        : `${value} ${unit}`;
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <label htmlFor={sliderId} className="font-medium cursor-pointer">
          {label}
        </label>
        <span className="text-muted-foreground">{unitLabel}</span>
      </div>
      <input
        id={sliderId}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
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
  onMinChange: (value: number) => void;
  onMaxChange: (value: number) => void;
  t: ReturnType<typeof useTranslations>;
}

function SettingRange({
  label,
  minValue,
  maxValue,
  minRange,
  maxRange,
  onMinChange,
  onMaxChange,
  t,
}: SettingRangeProps): React.ReactNode {
  const minInputId = `min-${label.replace(/\s+/g, "-").toLowerCase()}`;
  const maxInputId = `max-${label.replace(/\s+/g, "-").toLowerCase()}`;
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <label htmlFor={minInputId} className="font-medium cursor-pointer">
          {label}
        </label>
        <span className="text-muted-foreground">
          {t("yearRangeValue", { min: minValue, max: maxValue })}
        </span>
      </div>
      <div className="flex items-center gap-4">
        <input
          id={minInputId}
          type="number"
          min={minRange}
          max={maxValue - 1}
          value={minValue}
          onChange={(e) => onMinChange(Math.min(Number(e.target.value), maxValue - 1))}
          className="w-20 h-9 px-3 rounded-md border border-input bg-background text-sm"
        />
        <span className="text-muted-foreground">-</span>
        <input
          id={maxInputId}
          type="number"
          min={minValue + 1}
          max={maxRange}
          value={maxValue}
          onChange={(e) => onMaxChange(Math.max(Number(e.target.value), minValue + 1))}
          className="w-20 h-9 px-3 rounded-md border border-input bg-background text-sm"
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
