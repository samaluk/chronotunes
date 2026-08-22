"use client";

import { useSessionId } from "convex-helpers/react/sessions";
import { useMutation } from "convex/react";
import { Music } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useSyncExternalStore } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Label } from "@/components/ui/label";
import { LocaleSwitcher } from "@/components/ui/locale-switcher";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { api } from "@/convex/_generated/api";
import { runSafely } from "@/lib/run-safely";

const DISPLAY_NAME_KEY = "chronotunes-display-name";
const LOBBY_CODE_LENGTH = 6;

function validateLobbyCode(code: string): boolean {
  const cleaned = code.toUpperCase().replaceAll(/[^A-Z23456789]/g, "");
  return cleaned.length === LOBBY_CODE_LENGTH;
}

/* localStorage-backed external store so the saved display name can be read
   during render without an effect-driven state update. The cached snapshot
   keeps getSnapshot referentially stable across calls. */
let displayNameCache: string | null = null;
const displayNameSubscribers = new Set<() => void>();

function subscribeToDisplayName(onChange: () => void): () => void {
  displayNameSubscribers.add(onChange);
  return () => {
    displayNameSubscribers.delete(onChange);
  };
}

function getDisplayName(): string {
  if (displayNameCache === null) {
    displayNameCache =
      typeof window === "undefined" ? "" : (localStorage.getItem(DISPLAY_NAME_KEY) ?? "");
  }
  return displayNameCache;
}

const getEmptyDisplayName = (): string => "";

function saveDisplayName(name: string): void {
  if (typeof window !== "undefined") {
    displayNameCache = name.trim();
    localStorage.setItem(DISPLAY_NAME_KEY, name.trim());
    for (const notify of displayNameSubscribers) {
      notify();
    }
  }
}

export function LandingPageContent() {
  const t = useTranslations("landing");
  const tCommon = useTranslations("common");

  const [sessionId] = useSessionId();
  const createLobby = useMutation(api.lobbies.create);
  const joinLobby = useMutation(api.lobbies.join);

  // Saved value from storage plus a local draft while the user is typing.
  const storedDisplayName = useSyncExternalStore(
    subscribeToDisplayName,
    getDisplayName,
    getEmptyDisplayName,
  );
  const [draftDisplayName, setDraftDisplayName] = useState<string | null>(null);
  const displayName = draftDisplayName ?? storedDisplayName;

  const setDisplayNameState = (name: string): void => {
    setDraftDisplayName(name);
  };

  const [joinCode, setJoinCode] = useState("");
  const [isJoining, setIsJoining] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [showJoinForm, setShowJoinForm] = useState(false);

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
    await runSafely(
      async () => {
        saveDisplayName(name);
        const result = await createLobby({ displayName: name, sessionId });
        toast.success(t("gameCreated"), {
          description: t("shareCode", { code: result.code }),
        });
        window.location.href = `/lobby/${result.code}`;
      },
      (error: unknown) => {
        const message = error instanceof Error ? error.message : t("failedToCreate");
        toast.error(message);
      },
    );
    setIsCreating(false);
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

    const cleanedCode = joinCode.toUpperCase().replaceAll(/[^A-Z23456789]/g, "");
    if (!validateLobbyCode(cleanedCode)) {
      toast.error(t("invalidLobbyCode", { length: LOBBY_CODE_LENGTH }));
      return;
    }

    if (!sessionId) {
      toast.error(t("sessionError"));
      return;
    }

    setIsJoining(true);
    await runSafely(
      async () => {
        saveDisplayName(name);
        await joinLobby({ code: cleanedCode, displayName: name, sessionId });
        toast.success(t("joinedGame"));
        window.location.href = `/lobby/${cleanedCode}`;
      },
      (error: unknown) => {
        const message = error instanceof Error ? error.message : t("failedToJoin");
        toast.error(message);
      },
    );
    setIsJoining(false);
  };

  return (
    <div className="relative min-h-screen bg-background font-sans">
      <div className="bg-hero-glow pointer-events-none absolute inset-0 from-primary/10 via-background to-background" />
      <div className="relative mx-auto flex min-h-screen w-full max-w-4xl flex-col px-6 py-10 sm:px-12 sm:py-12 lg:py-14">
        <header className="flex w-full items-center justify-between">
          <div className="flex items-center gap-2">
            <Music className="h-8 w-8 text-primary" />
            <span className="font-bold text-2xl text-foreground">{t("title")}</span>
          </div>
          <div className="flex items-center gap-2">
            <LocaleSwitcher />
            <ThemeToggle />
          </div>
        </header>

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
                onChange={(e) => setDisplayNameState(e.target.value)}
                placeholder={t("displayNamePlaceholder")}
                type="text"
                value={displayName}
              />
            </div>

            {showJoinForm ? (
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <Label className="font-medium text-foreground text-sm" htmlFor="joinCode">
                    {t("lobbyCodeLabel")}
                  </Label>
                  <div className="flex w-full items-center justify-center">
                    <InputOTP
                      className="w-full"
                      containerClassName="w-full"
                      id="joinCode"
                      inputMode="text"
                      maxLength={6}
                      onChange={(value) => setJoinCode(value)}
                      value={joinCode}
                    >
                      <InputOTPGroup className="w-full">
                        <InputOTPSlot
                          className="aspect-square h-auto w-auto flex-1 text-3xl"
                          index={0}
                        />
                        <InputOTPSlot
                          className="aspect-square h-auto w-auto flex-1 text-3xl"
                          index={1}
                        />
                        <InputOTPSlot
                          className="aspect-square h-auto w-auto flex-1 text-3xl"
                          index={2}
                        />
                        <InputOTPSlot
                          className="aspect-square h-auto w-auto flex-1 text-3xl"
                          index={3}
                        />
                        <InputOTPSlot
                          className="aspect-square h-auto w-auto flex-1 text-3xl"
                          index={4}
                        />
                        <InputOTPSlot
                          className="aspect-square h-auto w-auto flex-1 text-3xl"
                          index={5}
                        />
                      </InputOTPGroup>
                    </InputOTP>
                  </div>
                </div>
                <div className="flex justify-between gap-4">
                  <Button
                    className="h-12 flex-1"
                    onClick={() => {
                      setShowJoinForm(false);
                      setJoinCode("");
                    }}
                    type="button"
                    variant={"outline"}
                  >
                    {tCommon("cancel")}
                  </Button>
                  <Button
                    className="h-12 flex-1"
                    disabled={isJoining || !sessionId}
                    onClick={handleJoinGame}
                    type="button"
                    variant={"default"}
                  >
                    {isJoining ? t("joinGameLoading") : t("joinGame")}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex justify-between gap-4">
                <Button
                  className="h-12"
                  disabled={isCreating || !sessionId}
                  onClick={handleCreateGame}
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
