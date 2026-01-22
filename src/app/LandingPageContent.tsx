"use client";

import { useMutation } from "convex/react";
import { useSessionId } from "convex-helpers/react/sessions";
import { Music } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { LocaleSwitcher } from "@/components/ui/locale-switcher";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { api } from "@/convex/_generated/api.js";

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
            <label htmlFor="displayName" className="text-sm font-medium text-foreground">
              {t("displayNameLabel")}
            </label>
            <input
              id="displayName"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayNameState(e.target.value)}
              placeholder={t("displayNamePlaceholder")}
              maxLength={20}
              className="flex h-12 w-full rounded-full border border-input bg-background px-4 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>

          {!showJoinForm ? (
            <div className="flex flex-col gap-4 sm:flex-row">
              <button
                type="button"
                onClick={handleCreateGame}
                disabled={isCreating || !sessionId}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-primary px-6 text-base font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isCreating ? t("createGameLoading") : t("createGame")}
              </button>
              <button
                type="button"
                onClick={() => setShowJoinForm(true)}
                className="inline-flex h-12 items-center justify-center rounded-full border border-input bg-background px-6 text-base font-medium text-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                {t("joinGame")}
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <label htmlFor="joinCode" className="text-sm font-medium text-foreground">
                  {t("lobbyCodeLabel")}
                </label>
                <input
                  id="joinCode"
                  type="text"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  placeholder={t("lobbyCodePlaceholder", { length: LOBBY_CODE_LENGTH })}
                  maxLength={LOBBY_CODE_LENGTH}
                  className="flex h-12 w-full rounded-full border border-input bg-background px-4 py-2 text-center text-2xl tracking-widest uppercase ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={handleJoinGame}
                  disabled={isJoining || !sessionId}
                  className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-full bg-primary px-6 text-base font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isJoining ? t("joinGameLoading") : t("joinGame")}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowJoinForm(false);
                    setJoinCode("");
                  }}
                  className="inline-flex h-12 flex-1 items-center justify-center rounded-full border border-input bg-background px-6 text-base font-medium text-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  {tCommon("cancel")}
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
