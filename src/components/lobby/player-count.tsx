"use client"

import { useQuery } from "convex/react"
import { Users } from "lucide-react"
import { useTranslations } from "next-intl"
import { memo } from "react"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"

interface PlayerCountProps {
  lobbyId: Id<"lobbies">
}

export const PlayerCount = memo(function PlayerCount({
  lobbyId,
}: PlayerCountProps): React.ReactNode {
  const t = useTranslations("lobby")
  const players = useQuery(api.players.list, { lobbyId })

  const count = players?.length ?? 0

  return (
    <div className="flex items-center justify-center gap-2 text-muted-foreground text-sm">
      <Users className="h-4 w-4" />
      <span>{t("playersInLobby", { count })}</span>
    </div>
  )
})
