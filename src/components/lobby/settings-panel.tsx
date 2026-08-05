"use client";

import { useSessionId } from "convex-helpers/react/sessions";
import { useMutation } from "convex/react";
import { Check, ChevronDown, ChevronUp, Settings2, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { SettingRange } from "@/components/settings/setting-range";
import { SettingSlider } from "@/components/settings/setting-slider";
import { ToggleSetting } from "@/components/settings/toggle-setting";
import { Button } from "@/components/ui/button";
import { api } from "@/convex/_generated/api";

interface SettingsPanelProps {
  code: string;
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
  isHost: boolean;
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

export function SettingsPanel({ code, isHost, currentSettings }: SettingsPanelProps) {
  const t = useTranslations("settings");

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
    if (!sessionId) {
      return;
    }
    try {
      await updateSettings({ code, sessionId, settings: { [key]: value } });
    } catch (error) {
      const message = error instanceof Error ? error.message : t("failedToSave");
      toast.error(message);
      setOptimisticSettings(currentSettings);
    }
  };

  if (!isHost) {
    return (
      <div className="space-y-3">
        <h3 className="flex items-center gap-2 font-semibold text-lg">
          <Settings2 className="h-5 w-5" />
          {t("title")}
        </h3>
        <div className="space-y-2 rounded-lg bg-muted p-4 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t("targetTimelineSize")}</span>
            <span className="font-medium">
              {t("targetCards", {
                count: optimisticSettings.targetTimelineSize,
              })}
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
              {t("bettingWindowSeconds", {
                count: optimisticSettings.bettingWindowSeconds,
              })}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t("yearRange")}</span>
            <span className="font-medium">
              {t("yearRangeValue", {
                max: optimisticSettings.maxYear,
                min: optimisticSettings.minYear,
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
      <Button
        className="flex w-full items-center justify-between"
        onClick={() => setIsExpanded(!isExpanded)}
        variant="outline"
      >
        <h3 className="flex items-center gap-2 font-semibold text-lg">
          <Settings2 className="h-5 w-5" />
          {t("title")}
        </h3>
        {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
      </Button>

      {isExpanded && (
        <div className="space-y-4 rounded-lg border bg-card p-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <SettingSlider
              label="targetTimelineSize"
              max={15}
              min={5}
              onChange={handleSettingChange}
              onCommit={handleCommit}
              step={1}
              unit="cards"
              value={optimisticSettings.targetTimelineSize}
            />

            <SettingSlider
              label="startingCoins"
              max={10}
              min={1}
              onChange={handleSettingChange}
              onCommit={handleCommit}
              step={1}
              unit="coins"
              value={optimisticSettings.startingCoins}
            />

            <SettingSlider
              label="turnSeconds"
              max={120}
              min={15}
              onChange={handleSettingChange}
              onCommit={handleCommit}
              step={5}
              unit="seconds"
              value={optimisticSettings.turnSeconds}
            />

            <SettingSlider
              label="bettingWindowSeconds"
              max={60}
              min={5}
              onChange={handleSettingChange}
              onCommit={handleCommit}
              step={5}
              unit="seconds"
              value={optimisticSettings.bettingWindowSeconds}
            />

            <div className="sm:col-span-2">
              <SettingRange
                label="yearRange"
                maxRange={2025}
                maxValue={optimisticSettings.maxYear}
                minRange={1950}
                minValue={optimisticSettings.minYear}
                onMaxChange={handleSettingChange}
                onMaxCommit={handleCommit}
                onMinChange={handleSettingChange}
                onMinCommit={handleCommit}
              />
            </div>
          </div>

          <div className="space-y-3 border-t pt-2">
            <ToggleSetting
              description={t("allowGuessTitleArtistDesc")}
              enabled={optimisticSettings.allowGuessTitleArtist}
              label={t("allowGuessTitleArtist")}
              onChange={(value) => {
                handleSettingChange("allowGuessTitleArtist", value);
                handleCommit("allowGuessTitleArtist", value);
              }}
            />

            <ToggleSetting
              description={t("showLiveBetsDesc")}
              enabled={optimisticSettings.showLiveBets}
              label={t("showLiveBets")}
              onChange={(value) => {
                handleSettingChange("showLiveBets", value);
                handleCommit("showLiveBets", value);
              }}
            />

            <ToggleSetting
              description={t("allowBetRetractionDesc")}
              enabled={optimisticSettings.allowBetRetraction}
              label={t("allowBetRetraction")}
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
