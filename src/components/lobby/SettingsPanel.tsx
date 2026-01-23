"use client";

import { useMutation } from "convex/react";
import { useSessionId } from "convex-helpers/react/sessions";
import { Check, ChevronDown, ChevronUp, Settings2, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { SettingRange } from "@/components/settings/SettingRange";
import { SettingSlider } from "@/components/settings/SettingSlider";
import { ToggleSetting } from "@/components/settings/ToggleSetting";
import { Button } from "@/components/ui/button";
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
      <Button
        variant="outline"
        className="w-full flex items-center justify-between"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Settings2 className="h-5 w-5" />
          {t("title")}
        </h3>
        {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
      </Button>

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
