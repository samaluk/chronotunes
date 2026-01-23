"use client";

import { useMutation } from "convex/react";
import { useSessionId } from "convex-helpers/react/sessions";
import { Music } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Label } from "@/components/ui/label";
import { LocaleSwitcher } from "@/components/ui/locale-switcher";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { api } from "@/convex/_generated/api";

const DISPLAY_NAME_KEY = "chronotunes-display-name";
const LOBBY_CODE_LENGTH = 6;

function validateLobbyCode(code: string): boolean {
  const cleaned = code.toUpperCase().replace(/[^A-Z23456789]/g, "");
  return cleaned.length === LOBBY_CODE_LENGTH;
}

function getDisplayName(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(DISPLAY_NAME_KEY) || "";
}

function saveDisplayName(name: string): void {
  if (typeof window !== "undefined") {
    localStorage.setItem(DISPLAY_NAME_KEY, name.trim());
  }
}

export function LandingPageContent() {
  const t = useTranslations("landing");
  const tCommon = useTranslations("common");

  const [sessionId] = useSessionId();
  const createLobby = useMutation(api.lobbies.create);
  const joinLobby = useMutation(api.lobbies.join);

  const [displayName, setDisplayNameState] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [isJoining, setIsJoining] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [showJoinForm, setShowJoinForm] = useState(false);

  useEffect(() => {
    const savedName = getDisplayName();
    if (savedName) {
      setDisplayNameState(savedName);
    }
  }, []);

  const handleCreateGame = async (): Promise<void> => {
    const name = displayName.trim();
    if (!name) {
      toast.error(t("displayNameRequired"));
      return;
    }
    if (name.length < 1 || name.length > 20) {
      toast.error(t("displayNameLength"));
      return;
    }

    if (!sessionId) {
      toast.error(t("sessionError"));
      return;
    }

    setIsCreating(true);
    try {
      saveDisplayName(name);
      const result = await createLobby({ sessionId, displayName: name });
      toast.success(t("gameCreated"), { description: t("shareCode", { code: result.code }) });
      window.location.href = `/lobby/${result.code}`;
    } catch (error) {
      const message = error instanceof Error ? error.message : t("failedToCreate");
      toast.error(message);
    } finally {
      setIsCreating(false);
    }
  };

  const handleJoinGame = async (): Promise<void> => {
    const name = displayName.trim();
    if (!name) {
      toast.error(t("displayNameRequired"));
      return;
    }
    if (name.length < 1 || name.length > 20) {
      toast.error(t("displayNameLength"));
      return;
    }

    const cleanedCode = joinCode.toUpperCase().replace(/[^A-Z23456789]/g, "");
    if (!validateLobbyCode(cleanedCode)) {
      toast.error(t("invalidLobbyCode", { length: LOBBY_CODE_LENGTH }));
      return;
    }

    if (!sessionId) {
      toast.error(t("sessionError"));
      return;
    }

    setIsJoining(true);
    try {
      saveDisplayName(name);
      await joinLobby({ code: cleanedCode, sessionId, displayName: name });
      toast.success(t("joinedGame"));
      window.location.href = `/lobby/${cleanedCode}`;
    } catch (error) {
      const message = error instanceof Error ? error.message : t("failedToJoin");
      toast.error(message);
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background font-sans">
      <main className="flex w-full max-w-3xl flex-col items-center justify-between gap-8 px-8 py-16 sm:px-16">
        <div className="flex w-full items-center justify-between">
          <div className="flex items-center gap-2">
            <Music className="h-8 w-8 text-primary" />
            <span className="text-2xl font-bold text-foreground">{t("title")}</span>
          </div>
          <div className="flex items-center gap-2">
            <LocaleSwitcher />
            <ThemeToggle />
          </div>
        </div>

        <div className="flex flex-col items-center gap-6 text-center">
          <h1 className="fl-text-2xl/4xl max-w-md font-semibold leading-tight tracking-tight text-foreground">
            {t("tagline")}
          </h1>
          <p className="fl-text-base/lg max-w-md leading-relaxed text-muted-foreground">
            {t("description")}
          </p>
        </div>

        <div className="flex w-full max-w-sm flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="displayName" className="text-sm font-medium text-foreground">
              {t("displayNameLabel")}
            </Label>
            <Input
              id="displayName"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayNameState(e.target.value)}
              placeholder={t("displayNamePlaceholder")}
              maxLength={20}
            />
          </div>

          {!showJoinForm ? (
            <div className="flex justify-between gap-4">
              <Button
                type="button"
                variant={"default"}
                onClick={handleCreateGame}
                disabled={isCreating || !sessionId}
                className="h-12"
              >
                {isCreating ? t("createGameLoading") : t("createGame")}
              </Button>
              <Button
                type="button"
                variant={"outline"}
                onClick={() => setShowJoinForm(true)}
                className="h-12"
              >
                {t("joinGame")}
              </Button>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="joinCode" className="text-sm font-medium text-foreground">
                  {t("lobbyCodeLabel")}
                </Label>
                <div className="flex w-full items-center justify-center">
                  <InputOTP
                    maxLength={6}
                    value={joinCode}
                    onChange={(value) => setJoinCode(value)}
                    className="w-full"
                    containerClassName="w-full"
                  >
                    <InputOTPGroup className="w-full">
                      <InputOTPSlot
                        index={0}
                        className="aspect-square h-auto w-auto flex-1 text-3xl"
                      />
                      <InputOTPSlot
                        index={1}
                        className="aspect-square h-auto w-auto flex-1 text-3xl"
                      />
                      <InputOTPSlot
                        index={2}
                        className="aspect-square h-auto w-auto flex-1 text-3xl"
                      />
                      <InputOTPSlot
                        index={3}
                        className="aspect-square h-auto w-auto flex-1 text-3xl"
                      />
                      <InputOTPSlot
                        index={4}
                        className="aspect-square h-auto w-auto flex-1 text-3xl"
                      />
                      <InputOTPSlot
                        index={5}
                        className="aspect-square h-auto w-auto flex-1 text-3xl"
                      />
                    </InputOTPGroup>
                  </InputOTP>
                </div>
              </div>
              <div className="flex justify-between gap-4">
                <Button
                  type="button"
                  variant={"outline"}
                  onClick={() => {
                    setShowJoinForm(false);
                    setJoinCode("");
                  }}
                  className="h-12 flex-1"
                >
                  {tCommon("cancel")}
                </Button>
                <Button
                  variant={"default"}
                  type="button"
                  onClick={handleJoinGame}
                  disabled={isJoining || !sessionId}
                  className="h-12 flex-1"
                >
                  {isJoining ? t("joinGameLoading") : t("joinGame")}
                </Button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
