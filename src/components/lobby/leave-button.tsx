"use client";

import { useSessionMutation } from "convex-helpers/react/sessions";
import { LogOut } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { memo, useCallback } from "react";
import { toast } from "sonner";

import { api } from "@/convex/_generated/api";

interface LeaveButtonProps {
  code: string;
}

export const LeaveButton = memo(function LeaveButton({
  code,
}: LeaveButtonProps): React.ReactNode {
  const t = useTranslations("lobby");
  const router = useRouter();
  const leaveLobby = useSessionMutation(api.lobbies.leave);

  const handleLeaveLobby = useCallback(async (): Promise<void> => {
    try {
      await leaveLobby({ code });
      toast.success(t("leftLobby"));
      router.push("/");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : t("failedToLeave");
      toast.error(message);
    }
  }, [leaveLobby, code, router, t]);

  return (
    <button
      className="inline-flex h-9 items-center justify-center rounded-md border border-input bg-background px-3 font-medium text-destructive transition-colors hover:bg-accent hover:text-destructive"
      onClick={handleLeaveLobby}
      type="button"
    >
      <LogOut className="h-4 w-4" />
    </button>
  );
});
