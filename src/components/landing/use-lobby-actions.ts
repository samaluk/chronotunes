"use client";

import { useSessionId } from "convex-helpers/react/sessions";
import { useMutation } from "convex/react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { api } from "@/convex/_generated/api";
import { saveDisplayName } from "@/components/landing/display-name-store";
import { runSafely } from "@/lib/run-safely";

const LOBBY_CODE_LENGTH = 6;

function validateLobbyCode(code: string): boolean {
  const cleaned = code.toUpperCase().replaceAll(/[^A-Z23456789]/g, "");
  return cleaned.length === LOBBY_CODE_LENGTH;
}

type DisplayNameError = "displayNameLength" | "displayNameRequired";

const displayNameErrorFor = (rawName: string): DisplayNameError | null => {
  const name = rawName.trim();
  if (!name) {
    return "displayNameRequired";
  }
  if (name.length < 1 || name.length > 20) {
    return "displayNameLength";
  }
  return null;
};

const actionErrorHandler =
  (fallbackMessage: string) =>
  (error: unknown): void => {
    toast.error(error instanceof Error ? error.message : fallbackMessage);
  };

/** Owns the busy flags and the create/join flows shared by both call-to-action buttons. */
export function useLobbyActions(displayName: string, t: ReturnType<typeof useTranslations>) {
  const router = useRouter();
  const [sessionId] = useSessionId();
  const createLobby = useMutation(api.lobbies.create);
  const joinLobby = useMutation(api.lobbies.join);

  const [isJoining, setIsJoining] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const handleCreateGame = async (): Promise<void> => {
    const error = displayNameErrorFor(displayName);
    if (error !== null) {
      toast.error(t(error));
      return;
    }
    if (!sessionId) {
      toast.error(t("sessionError"));
      return;
    }

    const name = displayName.trim();
    setIsCreating(true);
    await runSafely(
      async () => {
        saveDisplayName(name);
        const result = await createLobby({ displayName: name, sessionId });
        // The code comes back from the server; only navigate once it matches
        // the lobby-code shape so the target path can never be attacker-shaped.
        if (!validateLobbyCode(result.code)) {
          throw new Error(t("invalidLobbyCode", { length: LOBBY_CODE_LENGTH }));
        }
        toast.success(t("gameCreated"), {
          description: t("shareCode", { code: result.code }),
        });
        router.push(`/lobby/${result.code}`);
      },
      actionErrorHandler(t("failedToCreate")),
    );
    setIsCreating(false);
  };

  const handleJoinGame = async (joinCode: string): Promise<void> => {
    const error = displayNameErrorFor(displayName);
    if (error !== null) {
      toast.error(t(error));
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

    const name = displayName.trim();
    setIsJoining(true);
    await runSafely(
      async () => {
        saveDisplayName(name);
        await joinLobby({ code: cleanedCode, displayName: name, sessionId });
        toast.success(t("joinedGame"));
        router.push(`/lobby/${cleanedCode}`);
      },
      actionErrorHandler(t("failedToJoin")),
    );
    setIsJoining(false);
  };

  return { canAct: Boolean(sessionId), handleCreateGame, handleJoinGame, isCreating, isJoining };
}
