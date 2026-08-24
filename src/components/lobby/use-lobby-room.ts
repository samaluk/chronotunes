"use client";

import { useSessionId, useSessionMutation } from "convex-helpers/react/sessions";
import { useQuery } from "convex/react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { api } from "@/convex/_generated/api";

/** Session guard, leave mutation, clipboard action, and room queries. */
export function useLobbyRoom(code: string) {
  const t = useTranslations("lobby");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const [sessionId] = useSessionId();
  const leaveLobby = useSessionMutation(api.lobbies.leave);

  const handleCopyCode = (): void => {
    void navigator.clipboard.writeText(code);
    toast.success(tCommon("copied"), { description: t("copiedToClipboard") });
  };

  const handleLeaveLobby = async (): Promise<void> => {
    if (!sessionId) {
      return;
    }
    try {
      await leaveLobby({ code });
      toast.success(t("leftLobby"));
      router.push("/");
    } catch (error) {
      const message = error instanceof Error ? error.message : t("failedToLeave");
      toast.error(message);
    }
  };

  const lobby = useQuery(api.lobbies.get, code ? { code } : "skip");
  const players = useQuery(api.players.list, lobby?._id ? { lobbyId: lobby._id } : "skip");
  const me = useQuery(
    api.players.getMe,
    lobby?._id && sessionId ? { lobbyId: lobby._id, sessionId } : "skip",
  );

  return {
    handleCopyCode,
    handleLeaveLobby,
    isLoading: lobby === undefined || players === undefined,
    isMissing: lobby === null,
    lobby,
    me,
    players,
  };
}
