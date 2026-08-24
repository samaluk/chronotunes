"use client";

import { useSessionId } from "convex-helpers/react/sessions";
import { useMutation } from "convex/react";
import { Check, ChevronDown, ChevronUp, Settings2, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";

import { SettingRange } from "@/components/settings/setting-range";
import { SettingSlider } from "@/components/settings/setting-slider";
import { ToggleSetting } from "@/components/settings/toggle-setting";
import type { LobbySettings } from "@/components/settings/lobby-settings";
import { Button } from "@/components/ui/button";
import { api } from "@/convex/_generated/api";
import { runSafely } from "@/lib/run-safely";

export interface SettingsPanelProps {
  code: string;
  currentSettings: LobbySettings;
  isHost: boolean;
}

const BOOLEAN_SETTING_KEYS = [
  "allowGuessTitleArtist",
  "showLiveBets",
  "allowBetRetraction",
] as const;

/** Read-only settings summary shown to non-host players. */
function ReadOnlySettings({
  settings,
  t,
}: {
  settings: LobbySettings;
  t: ReturnType<typeof useTranslations>;
}): React.ReactNode {
  const rows: { key: string; label: string; value: React.ReactNode }[] = [
    {
      key: "targetTimelineSize",
      label: t("targetTimelineSize"),
      value: t("targetCards", { count: settings.targetTimelineSize }),
    },
    { key: "startingCoins", label: t("startingCoins"), value: settings.startingCoins },
    {
      key: "turnDuration",
      label: t("turnDuration"),
      value: t("turnSeconds", { count: settings.turnSeconds }),
    },
    {
      key: "bettingWindow",
      label: t("bettingWindow"),
      value: t("bettingWindowSeconds", { count: settings.bettingWindowSeconds }),
    },
    {
      key: "yearRange",
      label: t("yearRange"),
      value: t("yearRangeValue", { max: settings.maxYear, min: settings.minYear }),
    },
  ];

  return (
    <div className="space-y-3">
      <h3 className="flex items-center gap-2 font-semibold text-lg">
        <Settings2 className="h-5 w-5" />
        {t("title")}
      </h3>
      <div className="space-y-2 rounded-lg bg-muted p-4 text-sm">
        {rows.map((row) => (
          <div className="flex justify-between" key={row.key}>
            <span className="text-muted-foreground">{row.label}</span>
            <span className="font-medium">{row.value}</span>
          </div>
        ))}
        {BOOLEAN_SETTING_KEYS.map((key) => (
          <div className="flex justify-between" key={key}>
            <span className="text-muted-foreground">{t(key)}</span>
            <span className="font-medium">{settings[key] ? <Check /> : <X />}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function SettingsPanel({ code, isHost, currentSettings }: SettingsPanelProps) {
  const t = useTranslations("settings");

  const [sessionId] = useSessionId();
  const [isExpanded, setIsExpanded] = useState(false);

  // Optimistic overrides on top of the server settings. Local edits win until
  // the mutation echoes back through currentSettings; a failed commit drops
  // its override so the UI snaps back to the server value.
  const [overrides, setOverrides] = useState<Partial<LobbySettings>>({});
  const [lastEchoedSettings, setLastEchoedSettings] = useState(currentSettings);
  if (currentSettings !== lastEchoedSettings) {
    setLastEchoedSettings(currentSettings);
    setOverrides({});
  }

  const optimisticSettings: LobbySettings = { ...currentSettings, ...overrides };

  const updateSettings = useMutation(api.lobbies.updateSettings);

  const handleSettingChange = <K extends keyof LobbySettings>(
    key: K,
    value: LobbySettings[K],
  ): void => {
    setOverrides((prev) => ({ ...prev, [key]: value }));
  };

  const handleCommit = async <K extends keyof LobbySettings>(
    key: K,
    value: LobbySettings[K],
  ): Promise<void> => {
    if (!sessionId) {
      return;
    }
    await runSafely(
      () => updateSettings({ code, sessionId, settings: { [key]: value } }),
      (error: unknown) => {
        const message = error instanceof Error ? error.message : t("failedToSave");
        toast.error(message);
        setOverrides((prev) => {
          const next = { ...prev };
          delete next[key];
          return next;
        });
      },
    );
  };

  if (!isHost) {
    return <ReadOnlySettings settings={optimisticSettings} t={t} />;
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
                void handleCommit("allowGuessTitleArtist", value);
              }}
            />

            <ToggleSetting
              description={t("showLiveBetsDesc")}
              enabled={optimisticSettings.showLiveBets}
              label={t("showLiveBets")}
              onChange={(value) => {
                handleSettingChange("showLiveBets", value);
                void handleCommit("showLiveBets", value);
              }}
            />

            <ToggleSetting
              description={t("allowBetRetractionDesc")}
              enabled={optimisticSettings.allowBetRetraction}
              label={t("allowBetRetraction")}
              onChange={(value) => {
                handleSettingChange("allowBetRetraction", value);
                void handleCommit("allowBetRetraction", value);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
