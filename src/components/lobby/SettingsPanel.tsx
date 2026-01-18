"use client";

import { useMutation } from "convex/react";
import type { GenericId } from "convex/values";
import { ChevronDown, ChevronUp, Settings2 } from "lucide-react";
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
      toast.success("Settings saved");
      setHasChanges(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to save settings";
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
          Game Settings
        </h3>
        <div className="p-4 rounded-lg bg-muted text-sm space-y-2">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Target Timeline Size</span>
            <span className="font-medium">{currentSettings.targetTimelineSize} cards</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Starting Coins</span>
            <span className="font-medium">{currentSettings.startingCoins}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Turn Duration</span>
            <span className="font-medium">{currentSettings.turnSeconds}s</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Betting Window</span>
            <span className="font-medium">{currentSettings.bettingWindowSeconds}s</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Year Range</span>
            <span className="font-medium">
              {currentSettings.minYear} - {currentSettings.maxYear}
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
          Game Settings
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
              label="Target Timeline Size"
              value={settings.targetTimelineSize}
              min={5}
              max={15}
              step={1}
              onChange={(value) => handleSettingChange("targetTimelineSize", value)}
              unit="cards"
            />

            <SettingSlider
              label="Starting Coins"
              value={settings.startingCoins}
              min={1}
              max={10}
              step={1}
              onChange={(value) => handleSettingChange("startingCoins", value)}
              unit="coins"
            />

            <SettingSlider
              label="Turn Duration"
              value={settings.turnSeconds}
              min={15}
              max={120}
              step={5}
              onChange={(value) => handleSettingChange("turnSeconds", value)}
              unit="seconds"
            />

            <SettingSlider
              label="Betting Window"
              value={settings.bettingWindowSeconds}
              min={5}
              max={60}
              step={5}
              onChange={(value) => handleSettingChange("bettingWindowSeconds", value)}
              unit="seconds"
            />

            <div className="sm:col-span-2">
              <SettingRange
                label="Year Range"
                minValue={settings.minYear}
                maxValue={settings.maxYear}
                minRange={1950}
                maxRange={2025}
                onMinChange={(value) => handleSettingChange("minYear", value)}
                onMaxChange={(value) => handleSettingChange("maxYear", value)}
              />
            </div>
          </div>

          <div className="space-y-3 pt-2 border-t">
            <ToggleSetting
              label="Allow Guess Title/Artist"
              description="Award bonus coins for guessing song details"
              enabled={settings.allowGuessTitleArtist}
              onChange={(value) => handleSettingChange("allowGuessTitleArtist", value)}
            />

            <ToggleSetting
              label="Show Live Bets"
              description="Display other players bets during betting phase"
              enabled={settings.showLiveBets}
              onChange={(value) => handleSettingChange("showLiveBets", value)}
            />

            <ToggleSetting
              label="Allow Bet Retraction"
              description="Allow canceling unlocked bets before confirmation"
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
                Save Changes
              </button>
              <button
                type="button"
                onClick={handleReset}
                className="flex-1 inline-flex items-center justify-center h-10 px-4 rounded-md border border-input bg-background font-medium transition-colors hover:bg-accent"
              >
                Cancel
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
}

function SettingSlider({
  label,
  value,
  min,
  max,
  step,
  onChange,
  unit,
}: SettingSliderProps): React.ReactNode {
  const sliderId = `slider-${label.replace(/\s+/g, "-").toLowerCase()}`;
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <label htmlFor={sliderId} className="font-medium cursor-pointer">
          {label}
        </label>
        <span className="text-muted-foreground">
          {value} {unit}
        </span>
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
}

function SettingRange({
  label,
  minValue,
  maxValue,
  minRange,
  maxRange,
  onMinChange,
  onMaxChange,
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
          {minValue} - {maxValue}
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
