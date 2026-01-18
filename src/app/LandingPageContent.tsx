"use client";

import { useMutation } from "convex/react";
import { Music } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { api } from "@/convex/_generated/api.js";
import { useSessionId } from "@/lib/hooks/use-session-id";

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

export default function LandingPageContent(): React.ReactNode {
  const sessionId = useSessionId();
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
      toast.error("Please enter your display name");
      return;
    }
    if (name.length < 1 || name.length > 20) {
      toast.error("Display name must be between 1 and 20 characters");
      return;
    }

    if (!sessionId) {
      toast.error("Session not initialized");
      return;
    }

    setIsCreating(true);
    try {
      saveDisplayName(name);
      const result = await createLobby({ sessionId, displayName: name });
      toast.success("Game created!", { description: `Share code: ${result.code}` });
      window.location.href = `/lobby/${result.code}`;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to create game";
      toast.error(message);
    } finally {
      setIsCreating(false);
    }
  };

  const handleJoinGame = async (): Promise<void> => {
    const name = displayName.trim();
    if (!name) {
      toast.error("Please enter your display name");
      return;
    }
    if (name.length < 1 || name.length > 20) {
      toast.error("Display name must be between 1 and 20 characters");
      return;
    }

    const cleanedCode = joinCode.toUpperCase().replace(/[^A-Z23456789]/g, "");
    if (!validateLobbyCode(cleanedCode)) {
      toast.error(`Invalid lobby code. Please enter a ${LOBBY_CODE_LENGTH}-character code.`);
      return;
    }

    if (!sessionId) {
      toast.error("Session not initialized");
      return;
    }

    setIsJoining(true);
    try {
      saveDisplayName(name);
      await joinLobby({ code: cleanedCode, sessionId, displayName: name });
      toast.success("Joined game!");
      window.location.href = `/lobby/${cleanedCode}`;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to join game";
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
            <span className="text-2xl font-bold text-foreground">ChronoTunes</span>
          </div>
          <ThemeToggle />
        </div>

        <div className="flex flex-col items-center gap-6 text-center">
          <h1 className="fl-text-2xl/4xl max-w-md font-semibold leading-tight tracking-tight text-foreground">
            Music Timeline Game
          </h1>
          <p className="fl-text-base/lg max-w-md leading-relaxed text-muted-foreground">
            Test your music knowledge by placing songs in chronological order. Compete with friends
            and bet on outcomes!
          </p>
        </div>

        <div className="flex w-full max-w-sm flex-col gap-4">
          <div className="flex flex-col gap-2">
            <label htmlFor="displayName" className="text-sm font-medium text-foreground">
              Display Name
            </label>
            <input
              id="displayName"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayNameState(e.target.value)}
              placeholder="Enter your name"
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
                {isCreating ? "Creating..." : "Create Game"}
              </button>
              <button
                type="button"
                onClick={() => setShowJoinForm(true)}
                className="inline-flex h-12 items-center justify-center rounded-full border border-input bg-background px-6 text-base font-medium text-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                Join Game
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <label htmlFor="joinCode" className="text-sm font-medium text-foreground">
                  Lobby Code
                </label>
                <input
                  id="joinCode"
                  type="text"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  placeholder={`Enter ${LOBBY_CODE_LENGTH}-character code`}
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
                  {isJoining ? "Joining..." : "Join"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowJoinForm(false);
                    setJoinCode("");
                  }}
                  className="inline-flex h-12 flex-1 items-center justify-center rounded-full border border-input bg-background px-6 text-base font-medium text-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
