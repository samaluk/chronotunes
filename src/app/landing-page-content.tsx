"use client";

import { useTranslations } from "next-intl";
import { useSyncExternalStore, useState } from "react";

import {
  getDisplayName,
  getEmptyDisplayName,
  subscribeToDisplayName,
} from "@/components/landing/display-name-store";
import { JoinForm } from "@/components/landing/join-form";
import { LandingHeader } from "@/components/landing/landing-header";
import { useLobbyActions } from "@/components/landing/use-lobby-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function LandingPageContent() {
  const t = useTranslations("landing");
  const tCommon = useTranslations("common");

  // Saved value from storage plus a local draft while the user is typing.
  const storedDisplayName = useSyncExternalStore(
    subscribeToDisplayName,
    getDisplayName,
    getEmptyDisplayName,
  );
  const [draftDisplayName, setDraftDisplayName] = useState<string | null>(null);
  const displayName = draftDisplayName ?? storedDisplayName;

  const { canAct, handleCreateGame, handleJoinGame, isCreating, isJoining } = useLobbyActions(
    displayName,
    t,
  );

  const [joinCode, setJoinCode] = useState("");
  const [showJoinForm, setShowJoinForm] = useState(false);

  return (
    <div className="relative min-h-screen bg-background font-sans">
      <div className="bg-hero-glow pointer-events-none absolute inset-0 from-primary/10 via-background to-background" />
      <div className="relative mx-auto flex min-h-screen w-full max-w-4xl flex-col px-6 py-10 sm:px-12 sm:py-12 lg:py-14">
        <LandingHeader title={t("title")} />

        <main className="flex flex-1 flex-col items-center justify-center gap-6 py-10">
          <div className="flex flex-col items-center gap-4 text-center">
            <h1 className="fl-text-3xl/5xl max-w-2xl font-semibold text-foreground leading-tight tracking-tight">
              {t("tagline")}
            </h1>
            <p className="fl-text-base/lg max-w-2xl text-muted-foreground leading-relaxed">
              {t("description")}
            </p>
          </div>

          <div className="flex w-full max-w-lg flex-col gap-4 rounded-3xl border border-border/60 bg-card/90 p-6 shadow-lg shadow-primary/10 backdrop-blur sm:p-8">
            <div className="flex flex-col gap-2">
              <Label className="font-medium text-foreground text-sm" htmlFor="displayName">
                {t("displayNameLabel")}
              </Label>
              <Input
                id="displayName"
                maxLength={20}
                onChange={(e) => setDraftDisplayName(e.target.value)}
                placeholder={t("displayNamePlaceholder")}
                type="text"
                value={displayName}
              />
            </div>

            {showJoinForm ? (
              <JoinForm
                canAct={canAct}
                isJoining={isJoining}
                joinCode={joinCode}
                labels={{
                  cancel: tCommon("cancel"),
                  codeLabel: t("lobbyCodeLabel"),
                  join: t("joinGame"),
                  joinBusy: t("joinGameLoading"),
                }}
                onCancel={() => {
                  setShowJoinForm(false);
                  setJoinCode("");
                }}
                onCodeChange={setJoinCode}
                onJoin={() => void handleJoinGame(joinCode)}
              />
            ) : (
              <div className="flex justify-between gap-4">
                <Button
                  className="h-12"
                  disabled={isCreating || !canAct}
                  onClick={() => void handleCreateGame()}
                  type="button"
                  variant={"default"}
                >
                  {isCreating ? t("createGameLoading") : t("createGame")}
                </Button>
                <Button
                  className="h-12"
                  onClick={() => setShowJoinForm(true)}
                  type="button"
                  variant={"outline"}
                >
                  {t("joinGame")}
                </Button>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
